"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/modules/auth/session";
import { enqueueJob } from "@/modules/jobs/queue";
import type { Customer, RecordSaleResult } from "@/modules/shared/types";
import { recordSaleSchema, quickCustomerSchema, type RecordSaleInput } from "./schemas";

type RecordSaleResponse =
  | { ok: true; invoiceId: string }
  | { ok: false; error: string };

/**
 * Record a sale. Validates input, then delegates to the record_sale RPC, which
 * does the whole thing atomically (invoice + items + payment + audit) and
 * computes all totals server-side. We never trust client totals.
 */
export async function recordSale(
  input: RecordSaleInput,
): Promise<RecordSaleResponse> {
  const ctx = await getSessionContext();
  if (!ctx) return { ok: false, error: "Your session has expired. Log in again." };

  const parsed = recordSaleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid sale" };
  }
  const d = parsed.data;

  const payload = {
    customer_id: d.customerId,
    client_uuid: d.clientUuid ?? null,
    branch_id: d.branchId ?? null,
    due_at: d.dueAt ?? null,
    discount: d.discountKobo,
    items: d.items.map((i) => ({
      product_id: i.productId ?? null,
      description: i.description,
      quantity: i.quantity,
      unit_price: i.unitPriceKobo,
    })),
    payment: d.payment
      ? {
          amount: d.payment.amountKobo,
          method: d.payment.method,
          reference: d.payment.reference ?? null,
        }
      : null,
  };

  const supabase = createClient();
  const { data, error } = await supabase.rpc("record_sale", {
    p_payload: payload,
  });

  if (error) {
    // The RPC raises specific, user-facing messages (e.g. bad item, tenancy).
    return { ok: false, error: error.message };
  }

  const result = data as RecordSaleResult;

  // Phase 4: enqueue a receipt for delivery (the handler respects the company's
  // receipts setting). Idempotent per invoice. Best-effort — never fail the sale.
  try {
    await enqueueJob("receipt_delivery", {
      companyId: ctx.profile.company_id,
      payload: { invoice_id: result.invoice.id },
      dedupeKey: `job:receipt:${result.invoice.id}`,
    });
  } catch {
    /* receipt enqueue is non-critical */
  }

  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  return { ok: true, invoiceId: result.invoice.id };
}

/** Quick-add a customer from within the Record sale flow; returns the new row. */
export async function quickAddCustomer(input: {
  fullName: string;
  phone: string;
}): Promise<
  | { ok: true; customer: Customer }
  | { ok: false; error: string }
> {
  const ctx = await getSessionContext();
  if (!ctx) return { ok: false, error: "Your session has expired. Log in again." };

  const parsed = quickCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid customer" };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      company_id: ctx.profile.company_id,
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "This phone number is already on a customer" };
    }
    return { ok: false, error: "Could not add the customer" };
  }

  revalidatePath("/customers");
  return { ok: true, customer: data as Customer };
}
