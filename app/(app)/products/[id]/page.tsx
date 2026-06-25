import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSession, canManageOrg } from "@/modules/auth/session";
import { getProductDetail } from "@/modules/inventory/queries";
import type { Branch } from "@/modules/shared/types";
import { ProductDetailView } from "./product-detail";

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { profile } = await requireSession();
  const detail = await getProductDetail(params.id);
  if (!detail) notFound();

  const supabase = createClient();
  const { data: branches } = await supabase
    .from("branches")
    .select("*")
    .order("is_primary", { ascending: false })
    .order("name");

  return (
    <ProductDetailView
      detail={detail}
      branches={(branches as Branch[] | null) ?? []}
      canManage={canManageOrg(profile.role)}
    />
  );
}
