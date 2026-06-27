import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueJob } from "@/modules/jobs/queue";
import { verifyWebhookSignature, parseWebhookEvent } from "@/modules/payments";

// node:crypto + service-role client require the Node runtime (not edge).
export const runtime = "nodejs";

/**
 * Gateway webhook → auto-reconcile. Verifies the provider signature, normalises
 * the event, and hands it to the service-role `reconcile_gateway_payment` RPC
 * (idempotent). On a fresh success it fires the Phase-4 receipt job.
 *
 * Configure each gateway to POST here:
 *   /api/payments/webhook/paystack   /api/payments/webhook/monnify
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { provider: string } },
) {
  const provider = params.provider;
  const rawBody = await req.text();
  const signature =
    req.headers.get("x-paystack-signature") ??
    req.headers.get("monnify-signature") ??
    req.headers.get("x-trustops-signature");

  if (!verifyWebhookSignature(provider, rawBody, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const event = parseWebhookEvent(provider, body);
  if (!event) return NextResponse.json({ ok: true, ignored: true });

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("reconcile_gateway_payment", {
    p_payload: {
      reference: event.reference,
      provider_reference: event.providerReference,
      amount: event.amountKobo,
      status: event.status,
      method: event.method,
    },
  });
  // Ack with 200 even on a logical error so the gateway doesn't hammer retries;
  // the failure is surfaced in the body and the intent stays reconcilable.
  if (error) return NextResponse.json({ ok: false, error: error.message });

  const result = data as
    | { reconciled?: boolean; invoice_id?: string; company_id?: string }
    | null;

  if (result?.reconciled && result.invoice_id) {
    try {
      await enqueueJob("receipt_delivery", {
        payload: { invoice_id: result.invoice_id },
        companyId: result.company_id ?? null,
        // distinct from the sale-time receipt so an online payment still sends one
        dedupeKey: `job:receipt:reconcile:${result.invoice_id}`,
      });
    } catch {
      /* receipt enqueue is non-critical */
    }
  }

  return NextResponse.json({ ok: true });
}
