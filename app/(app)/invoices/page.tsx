import { requireSession } from "@/modules/auth/session";
import { listInvoices } from "@/modules/invoices/queries";
import { INVOICE_FILTERS, type InvoiceFilter } from "@/modules/invoices/status";
import { InvoicesClient } from "./invoices-client";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  await requireSession();

  const filter: InvoiceFilter = INVOICE_FILTERS.includes(
    searchParams.status as InvoiceFilter,
  )
    ? (searchParams.status as InvoiceFilter)
    : "all";
  const query = searchParams.q ?? "";

  const invoices = await listInvoices({ filter, search: query });

  return <InvoicesClient invoices={invoices} filter={filter} query={query} />;
}
