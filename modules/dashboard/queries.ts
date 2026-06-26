import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { InvoiceWithCustomer } from "@/modules/invoices/queries";
import { listLowStock, type LowStockItem } from "@/modules/inventory/queries";

export type RevenueTrendPoint = { label: string; amount: number; isToday: boolean };

export type DashboardData = {
  todayRevenue: number;
  revenueDelta: { direction: "up" | "down"; text: string } | null;
  unpaidTotal: number;
  customerCount: number;
  recentSales: InvoiceWithCustomer[];
  hasAnySales: boolean;
  lowStock: LowStockItem[];
  /** Last 7 days of revenue (payments received), oldest → today, for the trend chart. */
  revenueTrend: RevenueTrendPoint[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Start-of-day ISO timestamps in Africa/Lagos (WAT, UTC+1, no DST). */
function lagosDayBounds() {
  const dateInLagos = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayStr = dateInLagos.format(new Date());
  const todayStart = new Date(`${todayStr}T00:00:00+01:00`);
  const yesterdayStart = new Date(todayStart.getTime() - DAY_MS);
  // Start of the 7-day window (today + the 6 preceding days).
  const weekStart = new Date(todayStart.getTime() - 6 * DAY_MS);
  return {
    todayStart,
    yesterdayStart,
    weekStart,
  };
}

/** Bucket payments into the last 7 Lagos-days, labelled by weekday. */
function buildRevenueTrend(
  payments: { amount: number; paid_at: string }[],
  todayStart: Date,
): RevenueTrendPoint[] {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Lagos",
    weekday: "short",
  });
  const points: RevenueTrendPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(todayStart.getTime() - i * DAY_MS);
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);
    const amount = payments.reduce((sum, p) => {
      const t = new Date(p.paid_at).getTime();
      return t >= dayStart.getTime() && t < dayEnd.getTime() ? sum + p.amount : sum;
    }, 0);
    points.push({ label: weekday.format(dayStart), amount, isToday: i === 0 });
  }
  return points;
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = createClient();
  const { todayStart, yesterdayStart, weekStart } = lagosDayBounds();
  const todayStartIso = todayStart.toISOString();
  const yesterdayStartIso = yesterdayStart.toISOString();

  // Revenue = payments received. Pull the last 7 days for the trend chart, and
  // derive today + yesterday (for the delta) from the same rows.
  const { data: recentPayments } = await supabase
    .from("payments")
    .select("amount, paid_at")
    .gte("paid_at", weekStart.toISOString());

  const weekPayments =
    (recentPayments as { amount: number; paid_at: string }[] | null) ?? [];

  let todayRevenue = 0;
  let yesterdayRevenue = 0;
  for (const p of weekPayments) {
    if (p.paid_at >= todayStartIso) todayRevenue += p.amount;
    else if (p.paid_at >= yesterdayStartIso) yesterdayRevenue += p.amount;
  }

  const revenueTrend = buildRevenueTrend(weekPayments, todayStart);

  // Outstanding (unpaid total) = billed − paid over live, not-fully-paid invoices.
  const { data: openInvoices } = await supabase
    .from("invoices")
    .select("id, total")
    .is("deleted_at", null)
    .in("status", ["unpaid", "partial"]);
  const openRows = (openInvoices as { id: string; total: number }[] | null) ?? [];
  const openIds = openRows.map((i) => i.id);
  const billed = openRows.reduce((s, i) => s + i.total, 0);

  let paidOnOpen = 0;
  if (openIds.length > 0) {
    const { data: pays } = await supabase
      .from("payments")
      .select("amount")
      .in("invoice_id", openIds);
    paidOnOpen = ((pays as { amount: number }[] | null) ?? []).reduce(
      (s, p) => s + p.amount,
      0,
    );
  }
  const unpaidTotal = Math.max(0, billed - paidOnOpen);

  const { count: customerCount } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);

  const { data: recent } = await supabase
    .from("invoices")
    .select("*, customer:customers(id, full_name, phone)")
    .is("deleted_at", null)
    .order("issued_at", { ascending: false })
    .limit(10);
  const recentSales = (recent as unknown as InvoiceWithCustomer[] | null) ?? [];

  const lowStock = await listLowStock(5);

  // Delta line — the only place trend color appears. Only when meaningful.
  let revenueDelta: DashboardData["revenueDelta"] = null;
  if (yesterdayRevenue > 0) {
    const pct = Math.round(
      ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100,
    );
    revenueDelta = {
      direction: pct >= 0 ? "up" : "down",
      text: `${Math.abs(pct)}% vs yesterday`,
    };
  }

  return {
    todayRevenue,
    revenueDelta,
    unpaidTotal,
    customerCount: customerCount ?? 0,
    recentSales,
    hasAnySales: recentSales.length > 0,
    lowStock,
    revenueTrend,
  };
}
