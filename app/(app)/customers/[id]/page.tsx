import { notFound } from "next/navigation";
import { requireSession, canManageOrg } from "@/modules/auth/session";
import {
  getCustomer,
  getCustomerInvoices,
  getCustomerTotalSpend,
} from "@/modules/customers/queries";
import { getCustomerTrustScore } from "@/modules/customers/trust";
import { CustomerDetail } from "./customer-detail";

export default async function CustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { profile } = await requireSession();

  const customer = await getCustomer(params.id);
  if (!customer) notFound();

  const [invoices, totalSpend, trust] = await Promise.all([
    getCustomerInvoices(params.id),
    getCustomerTotalSpend(params.id),
    getCustomerTrustScore(params.id),
  ]);

  return (
    <CustomerDetail
      customer={customer}
      invoices={invoices}
      totalSpend={totalSpend}
      trust={trust}
      canManage={canManageOrg(profile.role)}
    />
  );
}
