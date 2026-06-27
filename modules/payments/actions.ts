"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/modules/auth/session";
import type { PaymentIntent } from "@/modules/shared/types";
import { getPaymentGateway } from "./index";

type LinkResult =
  | { ok: true; url: string; reference: string }
  | { ok: false; error: string };

/**
 * Create a pay-by-link for an invoice: open a payment intent (server computes
 * the outstanding balance), initialise the charge on the active gateway, persist
 * the hosted-checkout URL, and return it. Manual payments still use record_payment.
 */
export async function createPaymentLink(invoiceId: string): Promise<LinkResult> {
  const ctx = await getSessionContext();
  if (!ctx) return { ok: false, error: "Your session has expired. Log in again." };

  const supabase = createClient();
  const gateway = getPaymentGateway();

  const { data, error } = await supabase.rpc("create_payment_intent", {
    p_payload: { invoice_id: invoiceId, provider: gateway.provider },
  });
  if (error) return { ok: false, error: error.message };
  const intent = data as PaymentIntent;

  const result = await gateway.initializeCharge({
    companyId: intent.company_id,
    invoiceId: intent.invoice_id,
    amountKobo: intent.amount,
    customerEmail: intent.customer_email,
    reference: intent.reference,
  });
  if (result.status === "failed" || !result.authorizationUrl) {
    return { ok: false, error: "Could not start the payment. Check your gateway settings." };
  }

  await supabase.rpc("update_payment_intent_link", {
    p_payload: {
      reference: intent.reference,
      authorization_url: result.authorizationUrl,
      provider_reference: result.providerReference ?? null,
      provider: gateway.provider,
    },
  });

  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true, url: result.authorizationUrl, reference: intent.reference };
}
