import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Customer, Invoice } from "@/modules/shared/types";

/**
 * All queries run as the signed-in user — RLS scopes every result to their
 * company. Archived (soft-deleted) customers are hidden by default.
 */
export async function listCustomers(search?: string): Promise<Customer[]> {
  const supabase = createClient();
  let query = supabase
    .from("customers")
    .select("*")
    .is("deleted_at", null)
    .order("full_name", { ascending: true });

  if (search && search.trim().length > 0) {
    const term = search.trim().replace(/[%,]/g, " ");
    query = query.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%`);
  }

  const { data } = await query;
  return (data as Customer[] | null) ?? [];
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  return (data as Customer | null) ?? null;
}

export async function getCustomerInvoices(
  customerId: string,
): Promise<Invoice[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("invoices")
    .select("*")
    .eq("customer_id", customerId)
    .is("deleted_at", null)
    .order("issued_at", { ascending: false });
  return (data as Invoice[] | null) ?? [];
}

/** Total spend = sum of payments recorded against this customer's invoices (kobo). */
export async function getCustomerTotalSpend(
  customerId: string,
): Promise<number> {
  const supabase = createClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id")
    .eq("customer_id", customerId);
  const ids = ((invoices as { id: string }[] | null) ?? []).map((i) => i.id);
  if (ids.length === 0) return 0;

  const { data: payments } = await supabase
    .from("payments")
    .select("amount")
    .in("invoice_id", ids);
  return ((payments as { amount: number }[] | null) ?? []).reduce(
    (sum, p) => sum + p.amount,
    0,
  );
}
