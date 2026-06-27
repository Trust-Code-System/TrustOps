import "server-only";

import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";
import { formatDate } from "@/modules/shared/format";

/**
 * Customer trust / creditworthiness — computed from real payment history under
 * the caller's RLS scope (no new tables). Transparent and deterministic: the
 * score is driven by on-time payment rate, paid-in-full ratio, current overdue
 * exposure, and tenure — each surfaced as an explainable factor. On-brand for
 * TrustOps; helps decide whether to extend credit (the user still decides).
 */

export type TrustBand = "new" | "excellent" | "good" | "fair" | "at_risk";
export interface TrustFactor {
  label: string;
  value: string;
}
export interface TrustScore {
  score: number | null; // null = not enough history yet
  band: TrustBand;
  label: string;
  factors: TrustFactor[];
  outstandingKobo: number;
  suggestedCreditKobo: number;
}

export async function getCustomerTrustScore(customerId: string): Promise<TrustScore> {
  const supabase = createClient();
  const { data: invs } = await supabase
    .from("invoices")
    .select("id, total, issued_at, due_at")
    .eq("customer_id", customerId)
    .is("deleted_at", null);
  const invoices =
    (invs as { id: string; total: number; issued_at: string; due_at: string | null }[] | null) ?? [];

  if (invoices.length === 0) {
    return {
      score: null,
      band: "new",
      label: "New customer",
      factors: [{ label: "History", value: "No invoices yet" }],
      outstandingKobo: 0,
      suggestedCreditKobo: 0,
    };
  }

  const ids = invoices.map((i) => i.id);
  const { data: pays } = await supabase
    .from("payments")
    .select("invoice_id, amount, paid_at")
    .in("invoice_id", ids);
  const paidByInv = new Map<string, { sum: number; last: string | null }>();
  for (const p of (pays as { invoice_id: string; amount: number; paid_at: string }[] | null) ?? []) {
    const cur = paidByInv.get(p.invoice_id) ?? { sum: 0, last: null };
    cur.sum += p.amount;
    if (!cur.last || p.paid_at > cur.last) cur.last = p.paid_at;
    paidByInv.set(p.invoice_id, cur);
  }

  const now = Date.now();
  let totalInvoiced = 0;
  let fullyPaid = 0;
  let paidWithDue = 0;
  let onTime = 0;
  let overdueNow = 0;
  let overdueAmount = 0;
  let outstanding = 0;
  let earliest = Infinity;

  for (const inv of invoices) {
    totalInvoiced += inv.total;
    const pd = paidByInv.get(inv.id) ?? { sum: 0, last: null };
    const bal = inv.total - pd.sum;
    const issued = new Date(inv.issued_at).getTime();
    if (issued < earliest) earliest = issued;

    if (bal <= 0) {
      fullyPaid++;
      if (inv.due_at) {
        paidWithDue++;
        const dueEnd = new Date(inv.due_at).getTime() + 86_400_000; // grace to end of due day
        if (pd.last && new Date(pd.last).getTime() <= dueEnd) onTime++;
      }
    } else {
      outstanding += bal;
      if (inv.due_at && new Date(inv.due_at).getTime() < now) {
        overdueNow++;
        overdueAmount += bal;
      }
    }
  }

  const onTimeRate = paidWithDue > 0 ? onTime / paidWithDue : null;
  const tenureDays = Math.floor((now - earliest) / 86_400_000);

  let score = 60;
  if (onTimeRate !== null) score += Math.round((onTimeRate - 0.8) * 75);
  score -= Math.min(30, overdueNow * 12);
  if (fullyPaid >= 5) score += 8;
  if (tenureDays >= 180) score += 6;
  if (overdueAmount > 0 && totalInvoiced > 0) {
    score -= Math.min(15, Math.round((overdueAmount / totalInvoiced) * 30));
  }
  score = Math.max(0, Math.min(100, score));

  let band: TrustBand;
  let label: string;
  if (invoices.length < 2 && paidWithDue === 0) {
    band = "new";
    label = "New customer";
  } else if (score >= 80) {
    band = "excellent";
    label = "Excellent";
  } else if (score >= 65) {
    band = "good";
    label = "Good";
  } else if (score >= 50) {
    band = "fair";
    label = "Fair";
  } else {
    band = "at_risk";
    label = "At risk";
  }

  const avgInvoice = Math.round(totalInvoiced / invoices.length);
  const suggestedCreditKobo =
    band === "excellent" ? avgInvoice * 2 : band === "good" ? avgInvoice : 0;

  const factors: TrustFactor[] = [
    {
      label: "On-time payments",
      value:
        onTimeRate !== null
          ? `${onTime}/${paidWithDue} (${Math.round(onTimeRate * 100)}%)`
          : "No due-dated invoices yet",
    },
    { label: "Paid in full", value: `${fullyPaid} of ${invoices.length} invoices` },
    {
      label: "Currently overdue",
      value: overdueNow > 0 ? `${overdueNow} · ${formatNaira(overdueAmount)}` : "None",
    },
    { label: "Customer since", value: formatDate(new Date(earliest).toISOString()) },
  ];

  return {
    score: band === "new" ? null : score,
    band,
    label,
    factors,
    outstandingKobo: outstanding,
    suggestedCreditKobo,
  };
}
