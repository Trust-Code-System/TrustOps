import { requireSession } from "@/modules/auth/session";
import { listCustomersWithStats } from "@/modules/customers/queries";
import { CustomersClient } from "./customers-client";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  await requireSession();
  const query = searchParams.q ?? "";
  const { rows, metrics } = await listCustomersWithStats(query);

  return <CustomersClient customers={rows} metrics={metrics} query={query} />;
}
