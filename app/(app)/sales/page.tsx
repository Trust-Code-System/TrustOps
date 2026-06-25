import { redirect } from "next/navigation";

/**
 * Sales are recorded as invoices, and the brief defines no separate sales-list
 * screen. Nav now points "Sales" at /sales/new (record) and "Invoices" at the
 * list, so nothing links here anymore; this redirect is just a safety net for
 * old /sales links, sending them to the canonical invoices list.
 */
export default function SalesPage() {
  redirect("/invoices");
}
