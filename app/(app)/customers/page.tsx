import { requireSession } from "@/modules/auth/session";
import { listCustomers } from "@/modules/customers/queries";
import { CustomersClient } from "./customers-client";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  await requireSession();
  const query = searchParams.q ?? "";
  const customers = await listCustomers(query);

  return <CustomersClient customers={customers} query={query} />;
}
