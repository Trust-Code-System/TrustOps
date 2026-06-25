import type { InvoiceStatus } from "@/modules/shared/types";

/**
 * Effective (display) status. The stored status never silently flips to
 * 'overdue' (that would need a background job, out of scope); instead an unpaid
 * or partial invoice past its due date is shown as overdue at read time.
 */
export function effectiveStatus(inv: {
  status: InvoiceStatus;
  due_at: string | null;
  deleted_at?: string | null;
}): InvoiceStatus {
  if (inv.deleted_at) return "archived";
  if (
    (inv.status === "unpaid" || inv.status === "partial") &&
    inv.due_at &&
    new Date(inv.due_at) < new Date()
  ) {
    return "overdue";
  }
  return inv.status;
}

export const INVOICE_FILTERS = [
  "all",
  "unpaid",
  "partial",
  "paid",
  "overdue",
  "archived",
] as const;

export type InvoiceFilter = (typeof INVOICE_FILTERS)[number];
