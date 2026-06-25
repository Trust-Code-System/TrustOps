import { notFound } from "next/navigation";
import { requireSession, canManageOrg } from "@/modules/auth/session";
import { getInvoiceDetail } from "@/modules/invoices/queries";
import { InvoiceDetailView } from "./invoice-detail";

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { profile } = await requireSession();
  const detail = await getInvoiceDetail(params.id);
  if (!detail) notFound();

  return (
    <InvoiceDetailView detail={detail} canArchive={canManageOrg(profile.role)} />
  );
}
