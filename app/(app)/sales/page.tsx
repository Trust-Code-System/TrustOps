import { redirect } from "next/navigation";

/**
 * Sales are recorded as invoices, and the brief defines no separate sales-list
 * screen (only "Record sale" + the Invoices list). The Sales nav destination
 * therefore points at the canonical invoices list; the FAB still routes to
 * /sales/new to record a sale.
 */
export default function SalesPage() {
  redirect("/invoices");
}
