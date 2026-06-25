"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Package, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Money } from "@/components/ui/money";
import { StockBadge } from "@/components/ui/badge";
import { ProductFormModal } from "./product-form-modal";
import { cn } from "@/lib/utils";
import type { Branch } from "@/modules/shared/types";
import type { ProductWithStock } from "@/modules/inventory/queries";

type Filters = {
  q: string;
  category: string;
  active: string;
  lowStock: boolean;
};

export function ProductsClient({
  products,
  categories,
  branches,
  canManage,
  filters,
}: {
  products: ProductWithStock[];
  categories: string[];
  branches: Branch[];
  canManage: boolean;
  filters: Filters;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [term, setTerm] = useState(filters.q);
  const [open, setOpen] = useState(false);

  function push(next: Partial<Filters>) {
    const merged = { ...filters, q: term, ...next };
    const params = new URLSearchParams();
    if (merged.q.trim()) params.set("q", merged.q.trim());
    if (merged.category) params.set("category", merged.category);
    if (merged.active) params.set("active", merged.active);
    if (merged.lowStock) params.set("low", "1");
    startTransition(() => router.replace(`/products${params.size ? `?${params}` : ""}`));
  }

  const columns: Column<ProductWithStock>[] = [
    {
      key: "name",
      header: "Product",
      hideLabelOnMobile: true,
      cell: (p) => (
        <span>
          {p.name}
          {!p.is_active && (
            <span className="ml-2 text-caption text-text-muted">Inactive</span>
          )}
        </span>
      ),
    },
    {
      key: "sku",
      header: "SKU",
      cell: (p) => p.sku ?? <span className="text-text-muted">—</span>,
    },
    { key: "price", header: "Price", align: "right", cell: (p) => <Money kobo={p.sell_price} /> },
    {
      key: "stock",
      header: "Stock",
      align: "right",
      cell: (p) => <span className="tabular">{p.totalStock}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (p) => <StockBadge quantity={p.totalStock} isLow={p.isLowStock} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-display">Products</h1>
        {canManage && (
          <Button onClick={() => setOpen(true)}>
            <Plus /> Add product
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <Input
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              push({ q: e.target.value });
            }}
            placeholder="Search by name or SKU"
            aria-label="Search products"
            className="pl-10"
          />
        </div>
        <Select
          value={filters.category}
          onChange={(e) => push({ category: e.target.value })}
          aria-label="Filter by category"
          className="sm:w-44"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select
          value={filters.active}
          onChange={(e) => push({ active: e.target.value })}
          aria-label="Filter by status"
          className="sm:w-36"
        >
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
        <button
          type="button"
          onClick={() => push({ lowStock: !filters.lowStock })}
          aria-pressed={filters.lowStock}
          className={cn(
            "rounded-full px-3 py-2 text-small transition-colors duration-fast",
            filters.lowStock
              ? "bg-warning-500 text-text-on-primary"
              : "bg-gray-100 text-text-secondary hover:bg-gray-200",
          )}
        >
          Low stock
        </button>
      </div>

      <div aria-busy={pending ? "true" : undefined}>
        <DataTable
          columns={columns}
          rows={products}
          rowKey={(p) => p.id}
          onRowClick={(p) => router.push(`/products/${p.id}`)}
          emptyState={
            <EmptyState
              icon={Package}
              title={
                filters.q || filters.category || filters.active || filters.lowStock
                  ? "No matching products"
                  : "No products yet"
              }
              description={
                filters.q || filters.category || filters.active || filters.lowStock
                  ? "Try a different search or filter."
                  : "Add your first product to track stock and sell it."
              }
              action={
                canManage &&
                !(filters.q || filters.category || filters.active || filters.lowStock) ? (
                  <Button onClick={() => setOpen(true)}>Add product</Button>
                ) : undefined
              }
            />
          }
        />
      </div>

      {canManage && (
        <ProductFormModal
          key="new"
          open={open}
          onClose={() => setOpen(false)}
          product={null}
          branches={branches}
        />
      )}
    </div>
  );
}
