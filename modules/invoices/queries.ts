import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  Invoice,
  InvoiceItem,
  Payment,
  Customer,
} from "@/modules/shared/types";
import type { InvoiceFilter } from "./status";

export type InvoiceWithCustomer = Invoice & {
  customer: Pick<Customer, "id" | "full_name" | "phone"> | null;
};

export type InvoiceDetail = {
  invoice: InvoiceWithCustomer;
  items: InvoiceItem[];
  payments: Payment[];
};

/** List invoices with their customer, filtered by status and an optional search. */
export async function listInvoices(opts: {
  filter?: InvoiceFilter;
  search?: string;
}): Promise<InvoiceWithCustomer[]> {
  const supabase = createClient();
  const filter = opts.filter ?? "all";

  let query = supabase
    .from("invoices")
    .select("*, customer:customers(id, full_name, phone)")
    .order("issued_at", { ascending: false });

  // Archived = soft-deleted; everything else is live.
  if (filter === "archived") {
    query = query.not("deleted_at", "is", null);
  } else {
    query = query.is("deleted_at", null);
    if (filter === "overdue") {
      query = query
        .in("status", ["unpaid", "partial"])
        .lt("due_at", new Date().toISOString());
    } else if (filter !== "all") {
      query = query.eq("status", filter);
    }
  }

  const term = opts.search?.trim();
  if (term) {
    const safe = term.replace(/[%,()]/g, " ");
    // Match invoice number, or any customer whose name/phone matches.
    const { data: matchedCustomers } = await supabase
      .from("customers")
      .select("id")
      .or(`full_name.ilike.%${safe}%,phone.ilike.%${safe}%`);
    const ids = ((matchedCustomers as { id: string }[] | null) ?? []).map((c) => c.id);
    const ors = [`invoice_number.ilike.%${safe}%`];
    if (ids.length > 0) ors.push(`customer_id.in.(${ids.join(",")})`);
    query = query.or(ors.join(","));
  }

  const { data } = await query;
  // Cast via unknown: the FK embed resolves at runtime, but the hand-written
  // Database type carries empty Relationships so the client can't infer it.
  return (data as unknown as InvoiceWithCustomer[] | null) ?? [];
}

export async function getInvoiceDetail(id: string): Promise<InvoiceDetail | null> {
  const supabase = createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, customer:customers(id, full_name, phone)")
    .eq("id", id)
    .maybeSingle();
  if (!invoice) return null;

  const [{ data: items }, { data: payments }] = await Promise.all([
    supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("payments")
      .select("*")
      .eq("invoice_id", id)
      .order("paid_at", { ascending: false }),
  ]);

  return {
    invoice: invoice as unknown as InvoiceWithCustomer,
    items: (items as InvoiceItem[] | null) ?? [],
    payments: (payments as Payment[] | null) ?? [],
  };
}
