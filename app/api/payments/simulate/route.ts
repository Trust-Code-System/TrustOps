import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueJob } from "@/modules/jobs/queue";

// service-role client requires the Node runtime.
export const runtime = "nodejs";

/**
 * Self-serve "pay" for the SIMULATED gateway only (demo / no real keys).
 * Reconciles a pending intent whose provider is 'simulated'. For real providers
 * (paystack/monnify) this refuses — those settle via the signed gateway webhook.
 * The reference is unguessable, so this can't be used to mark arbitrary invoices.
 */
export async function POST(req: NextRequest) {
  let reference: string | undefined;
  try {
    reference = (await req.json())?.reference;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!reference) return NextResponse.json({ error: "reference required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: intent } = await admin
    .from("payment_intents")
    .select("reference, provider, amount, status")
    .eq("reference", reference)
    .maybeSingle();

  const row = intent as
    | { reference: string; provider: string; amount: number; status: string }
    | null;
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (row.provider !== "simulated") {
    return NextResponse.json({ error: "this invoice is paid through its gateway" }, { status: 400 });
  }
  if (row.status === "success") return NextResponse.json({ ok: true, already: true });

  const { data, error } = await admin.rpc("reconcile_gateway_payment", {
    p_payload: {
      reference: row.reference,
      provider_reference: `SIM_${Date.now()}`,
      amount: row.amount,
      status: "success",
      method: "transfer",
    },
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const result = data as { reconciled?: boolean; invoice_id?: string; company_id?: string } | null;
  if (result?.reconciled && result.invoice_id) {
    try {
      await enqueueJob("receipt_delivery", {
        payload: { invoice_id: result.invoice_id },
        companyId: result.company_id ?? null,
        dedupeKey: `job:receipt:reconcile:${result.invoice_id}`,
      });
    } catch {
      /* receipt is non-critical */
    }
  }
  return NextResponse.json({ ok: true });
}
