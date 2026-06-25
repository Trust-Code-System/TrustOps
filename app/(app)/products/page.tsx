import { createClient } from "@/lib/supabase/server";
import { requireSession, canManageOrg } from "@/modules/auth/session";
import { listProducts, listCategories } from "@/modules/inventory/queries";
import type { Branch } from "@/modules/shared/types";
import { ProductsClient } from "./products-client";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; active?: string; low?: string };
}) {
  const { profile } = await requireSession();

  const filters = {
    q: searchParams.q ?? "",
    category: searchParams.category ?? "",
    active: searchParams.active === "active" || searchParams.active === "inactive"
      ? searchParams.active
      : "",
    lowStock: searchParams.low === "1",
  };

  const supabase = createClient();
  const [products, categories, { data: branches }] = await Promise.all([
    listProducts({
      search: filters.q,
      category: filters.category || undefined,
      active: (filters.active || undefined) as "active" | "inactive" | undefined,
      lowStock: filters.lowStock,
    }),
    listCategories(),
    supabase
      .from("branches")
      .select("*")
      .order("is_primary", { ascending: false })
      .order("name"),
  ]);

  return (
    <ProductsClient
      products={products}
      categories={categories}
      branches={(branches as Branch[] | null) ?? []}
      canManage={canManageOrg(profile.role)}
      filters={filters}
    />
  );
}
