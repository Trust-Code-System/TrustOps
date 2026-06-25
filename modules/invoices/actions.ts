"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/modules/auth/session";
import { recordPaymentSchema, type RecordPaymentInput } from "./schemas";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Record a payment against an existing invoice via the record_payment RPC,
 * which inserts the payment, recomputes status, and audits — atomically.
 */
export async function recordPayment(input: RecordPaymentInput): Promise<Result> {
  const ctx = await getSessionContext();
  if (!ctx) return { ok: false, error: "Your session has expired. Log in again." };

  const parsed = recordPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payment" };
  }
  const d = parsed.data;

  const supabase = createClient();
  const { error } = await supabase.rpc("record_payment", {
    p_payload: {
      invoice_id: d.invoiceId,
      amount: d.amountKobo,
      method: d.method,
      reference: d.reference ?? null,
    },
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/invoices/${d.invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Archive (soft delete) an invoice via the audited archive_invoice RPC. */
export async function archiveInvoice(invoiceId: string): Promise<Result> {
  const ctx = await getSessionContext();
  if (!ctx) return { ok: false, error: "Your session has expired. Log in again." };

  const supabase = createClient();
  const { error } = await supabase.rpc("archive_invoice", {
    p_invoice_id: invoiceId,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true };
}
