import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Product, StockMovement } from "@/modules/shared/types";

export type InventoryRow = {
  branch_id: string;
  quantity: number;
  low_stock_threshold: number;
};

export type ProductWithStock = Product & {
  inventory: InventoryRow[];
  totalStock: number;
  isLowStock: boolean;
};

export type ProductFilter = {
  search?: string;
  category?: string;
  active?: "active" | "inactive";
  lowStock?: boolean;
};

/** A branch is "low" when it tracks a threshold (>0) and is at/below it. */
function rowIsLow(r: InventoryRow): boolean {
  return r.low_stock_threshold > 0 && r.quantity <= r.low_stock_threshold;
}

export async function listProducts(
  filter: ProductFilter = {},
): Promise<ProductWithStock[]> {
  const supabase = createClient();
  let query = supabase
    .from("products")
    .select("*, inventory(branch_id, quantity, low_stock_threshold)")
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (filter.search?.trim()) {
    const term = filter.search.trim().replace(/[%,()]/g, " ");
    query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%`);
  }
  if (filter.category) query = query.eq("category", filter.category);
  if (filter.active === "active") query = query.eq("is_active", true);
  if (filter.active === "inactive") query = query.eq("is_active", false);

  const { data } = await query;
  const rows = (data as unknown as (Product & { inventory: InventoryRow[] })[] | null) ?? [];

  const mapped: ProductWithStock[] = rows.map((p) => {
    const inv = p.inventory ?? [];
    return {
      ...p,
      inventory: inv,
      totalStock: inv.reduce((s, r) => s + r.quantity, 0),
      isLowStock: inv.some(rowIsLow),
    };
  });

  return filter.lowStock ? mapped.filter((p) => p.isLowStock) : mapped;
}

/** Distinct categories for the filter dropdown. */
export async function listCategories(): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("products")
    .select("category")
    .is("deleted_at", null)
    .not("category", "is", null);
  const set = new Set(
    ((data as { category: string | null }[] | null) ?? [])
      .map((r) => r.category)
      .filter((c): c is string => !!c),
  );
  return [...set].sort();
}

export type ProductInventoryRow = InventoryRow & { branch: { name: string } | null };
export type ProductMovementRow = StockMovement & { branch: { name: string } | null };

export type ProductDetail = {
  product: Product;
  inventory: ProductInventoryRow[];
  movements: ProductMovementRow[];
  totalStock: number;
};

export async function getProductDetail(id: string): Promise<ProductDetail | null> {
  const supabase = createClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!product) return null;

  const [{ data: inventory }, { data: movements }] = await Promise.all([
    supabase
      .from("inventory")
      .select("branch_id, quantity, low_stock_threshold, branch:branches(name)")
      .eq("product_id", id),
    supabase
      .from("stock_movements")
      .select("*, branch:branches(name)")
      .eq("product_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const inv = (inventory as unknown as ProductInventoryRow[] | null) ?? [];
  return {
    product: product as Product,
    inventory: inv,
    movements: (movements as unknown as ProductMovementRow[] | null) ?? [],
    totalStock: inv.reduce((s, r) => s + r.quantity, 0),
  };
}

export type LowStockItem = {
  product_id: string;
  product_name: string;
  branch_name: string;
  quantity: number;
  low_stock_threshold: number;
};

/** Items at/below their threshold — for the dashboard widget and filter. */
export async function listLowStock(limit = 50): Promise<LowStockItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("inventory")
    .select(
      "quantity, low_stock_threshold, product:products(id, name, deleted_at), branch:branches(name)",
    )
    .gt("low_stock_threshold", 0);

  type Raw = {
    quantity: number;
    low_stock_threshold: number;
    product: { id: string; name: string; deleted_at: string | null } | null;
    branch: { name: string } | null;
  };
  return ((data as unknown as Raw[] | null) ?? [])
    .filter(
      (r) =>
        r.product &&
        !r.product.deleted_at &&
        r.quantity <= r.low_stock_threshold,
    )
    .slice(0, limit)
    .map((r) => ({
      product_id: r.product!.id,
      product_name: r.product!.name,
      branch_name: r.branch?.name ?? "—",
      quantity: r.quantity,
      low_stock_threshold: r.low_stock_threshold,
    }));
}
