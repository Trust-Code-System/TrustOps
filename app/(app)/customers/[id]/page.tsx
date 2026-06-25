import { notFound } from "next/navigation";
import { requireSession, canManageOrg } from "@/modules/auth/session";
import {
  getCustomer,
  getCustomerInvoices,
  getCustomerTotalSpend,
} from "@/modules/customers/queries";
import { CustomerDetail } from "./customer-detail";

export default async function CustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { profile } = await requireSession();

  const customer = await getCustomer(params.id);
  if (!customer) notFound();

  const [invoices, totalSpend] = await Promise.all([
    getCustomerInvoices(params.id),
    getCustomerTotalSpend(params.id),
  ]);

  return (
    <CustomerDetail
      customer={customer}
      invoices={invoices}
      totalSpend={totalSpend}
      canManage={canManageOrg(profile.role)}
    />
  );
}
