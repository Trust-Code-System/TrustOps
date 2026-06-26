import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Customer, Invoice } from "@/modules/shared/types";
import { effectiveStatus } from "@/modules/invoices/status";

export type CustomerStatus = "active" | "inactive" | "overdue";

/** A customer enriched with the aggregates the Customers table surfaces. */
export type CustomerWithStats = Customer & {
  /** Sum of payments recorded against this customer's invoices (kobo). */
  totalSpend: number;
  invoiceCount: number;
  /** Latest invoice issue date, or null if they have none. */
  lastActivityAt: string | null;
  status: CustomerStatus;
};

export type CustomerMetrics = {
  totalCustomers: number;
  activeThisWeek: number;
  /** Average lifetime spend per customer (kobo). */
  avgLtv: number;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Customers + per-customer stats + headline metrics, for the Customers screen.
 *
 * RLS scopes invoices/payments to the company, so we pull them once and
 * aggregate in memory (SME scale). Status is derived: overdue if any invoice is
 * past due, active if there was activity in the last 30 days, else inactive.
 * Metrics are computed over ALL customers so they stay stable while searching.
 */
export async function listCustomersWithStats(search?: string): Promise<{
  rows: CustomerWithStats[];
  metrics: CustomerMetrics;
}> {
  const supabase = createClient();

  const { data: customerData } = await supabase
    .from("customers")
    .select("*")
    .is("deleted_at", null)
    .order("full_name", { ascending: true });
  const customers = (customerData as Customer[] | null) ?? [];

  const { data: invoiceData } = await supabase
    .from("invoices")
    .select("id, customer_id, total, status, due_at, issued_at")
    .is("deleted_at", null);
  type InvoiceRow = Pick<
    Invoice,
    "id" | "customer_id" | "total" | "status" | "due_at" | "issued_at"
  >;
  const invoices = (invoiceData as InvoiceRow[] | null) ?? [];

  const paidByInvoice = new Map<string, number>();
  if (invoices.length > 0) {
    const { data: paymentData } = await supabase
      .from("payments")
      .select("amount, invoice_id")
      .in(
        "invoice_id",
        invoices.map((i) => i.id),
      );
    for (const p of (paymentData as
      | { amount: number; invoice_id: string }[]
      | null) ?? []) {
      paidByInvoice.set(
        p.invoice_id,
        (paidByInvoice.get(p.invoice_id) ?? 0) + p.amount,
      );
    }
  }

  const byCustomer = new Map<string, InvoiceRow[]>();
  for (const inv of invoices) {
    const arr = byCustomer.get(inv.customer_id) ?? [];
    arr.push(inv);
    byCustomer.set(inv.customer_id, arr);
  }

  const now = Date.now();

  const allRows: CustomerWithStats[] = customers.map((c) => {
    const list = byCustomer.get(c.id) ?? [];
    let totalSpend = 0;
    let lastActivityAt: string | null = null;
    let hasOverdue = false;
    for (const inv of list) {
      totalSpend += paidByInvoice.get(inv.id) ?? 0;
      if (!lastActivityAt || inv.issued_at > lastActivityAt) {
        lastActivityAt = inv.issued_at;
      }
      if (effectiveStatus({ status: inv.status, due_at: inv.due_at }) === "overdue") {
        hasOverdue = true;
      }
    }
    const recent =
      lastActivityAt != null &&
      now - new Date(lastActivityAt).getTime() <= MONTH_MS;
    const status: CustomerStatus = hasOverdue
      ? "overdue"
      : recent
        ? "active"
        : "inactive";
    return { ...c, totalSpend, invoiceCount: list.length, lastActivityAt, status };
  });

  const activeThisWeek = allRows.filter(
    (r) =>
      r.lastActivityAt != null &&
      now - new Date(r.lastActivityAt).getTime() <= WEEK_MS,
  ).length;
  const totalSpendAll = allRows.reduce((s, r) => s + r.totalSpend, 0);
  const avgLtv = allRows.length ? Math.round(totalSpendAll / allRows.length) : 0;

  const term = (search ?? "").trim().toLowerCase();
  const rows = term
    ? allRows.filter(
        (r) =>
          r.full_name.toLowerCase().includes(term) ||
          r.phone.toLowerCase().includes(term) ||
          (r.email ?? "").toLowerCase().includes(term),
      )
    : allRows;

  return {
    rows,
    metrics: {
      totalCustomers: allRows.length,
      activeThisWeek,
      avgLtv,
    },
  };
}

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
