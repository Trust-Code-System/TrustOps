"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Money } from "@/components/ui/money";
import { ProductFormModal } from "./product-form-modal";
import { cn } from "@/lib/utils";
import type { Branch } from "@/modules/shared/types";
import type {
  ProductWithStock,
  InventoryMetrics,
} from "@/modules/inventory/queries";

const PAGE_SIZE = 8;

type Filters = {
  q: string;
  category: string;
  active: string;
  lowStock: boolean;
};

export function ProductsClient({
  products,
  categories,
  metrics,
  branches,
  canManage,
  filters,
}: {
  products: ProductWithStock[];
  categories: string[];
  metrics: InventoryMetrics;
  branches: Branch[];
  canManage: boolean;
  filters: Filters;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [term, setTerm] = useState(filters.q);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);

  function push(next: Partial<Filters>) {
    const merged = { ...filters, q: term, ...next };
    const params = new URLSearchParams();
    if (merged.q.trim()) params.set("q", merged.q.trim());
    if (merged.category) params.set("category", merged.category);
    if (merged.active) params.set("active", merged.active);
    if (merged.lowStock) params.set("low", "1");
    setPage(1);
    startTransition(() =>
      router.replace(`/products${params.size ? `?${params}` : ""}`),
    );
  }

  const hasFilters = Boolean(
    filters.q || filters.category || filters.active || filters.lowStock,
  );

  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = products.slice(start, start + PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-display">Inventory</h1>
          <p className="mt-1 text-body text-text-secondary">
            Monitor stock levels across all branches.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setOpen(true)}>
            <Plus /> Add product
          </Button>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <StatTile label="Total Value">
          <Money kobo={metrics.totalValue} className="text-metric" />
        </StatTile>
        <StatTile label="Low Stock Alerts">
          <span
            className={cn(
              "text-metric tabular",
              metrics.lowStockCount > 0 ? "text-danger-500" : "text-text-primary",
            )}
          >
            {metrics.lowStockCount}
          </span>
        </StatTile>
        <StatTile label="Categories">
          <span className="text-metric tabular text-text-primary">
            {metrics.categoryCount}
          </span>
        </StatTile>
      </div>

      {/* Table container */}
      <Card className="overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-border-subtle p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:w-72">
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
              placeholder="Search by name or SKU…"
              aria-label="Search products"
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filters.category}
              onChange={(e) => push({ category: e.target.value })}
              aria-label="Filter by category"
              className="w-full sm:w-44"
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
              className="w-full sm:w-36"
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
                "inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-small transition-colors",
                filters.lowStock
                  ? "border-warning-500 bg-warning-50 text-warning-700"
                  : "border-border text-text-secondary hover:bg-gray-100",
              )}
            >
              <AlertTriangle className="h-[18px] w-[18px]" aria-hidden="true" />
              Low stock
            </button>
          </div>
        </div>

        {/* Body */}
        {products.length === 0 ? (
          <EmptyState
            icon={Package}
            title={hasFilters ? "No matching products" : "No products yet"}
            description={
              hasFilters
                ? "Try a different search or filter."
                : "Add your first product to track stock and sell it."
            }
            action={
              canManage && !hasFilters ? (
                <Button onClick={() => setOpen(true)}>Add product</Button>
              ) : undefined
            }
          />
        ) : (
          <div aria-busy={pending ? "true" : undefined}>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="bg-gray-50">
                    <Th>Product Name</Th>
                    <Th>SKU</Th>
                    <Th>Stock Level</Th>
                    <Th align="right">Price</Th>
                    <Th align="center">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => router.push(`/products/${p.id}`)}
                      className={cn(
                        "group cursor-pointer border-b border-border-subtle transition-colors last:border-0 hover:bg-gray-50",
                        p.totalStock <= 0 || p.isLowStock ? "bg-danger-50/40" : "",
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-gray-100 text-text-muted">
                            <Package className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <span className="text-[15px] font-[600] text-text-primary">
                            {p.name}
                            {!p.is_active && (
                              <span className="ml-2 align-middle text-caption font-[500] uppercase tracking-[0.04em] text-text-muted">
                                Inactive
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-small text-text-muted">
                        {p.sku ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StockPill product={p} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Money kobo={p.sell_price} className="text-[15px]" />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          aria-label={`Open ${p.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/products/${p.id}`);
                          }}
                          className="rounded-md p-1.5 text-text-muted opacity-0 transition-opacity hover:bg-gray-100 hover:text-primary-600 focus:opacity-100 group-hover:opacity-100"
                        >
                          <MoreVertical className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-border-subtle sm:hidden">
              {pageRows.map((p) => (
                <li
                  key={p.id}
                  onClick={() => router.push(`/products/${p.id}`)}
                  className="flex cursor-pointer items-center gap-3 p-4 active:bg-gray-50"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-gray-100 text-text-muted">
                    <Package className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[15px] font-[600] text-text-primary">
                        {p.name}
                      </span>
                      <Money kobo={p.sell_price} className="text-small" />
                    </div>
                    <div className="mt-1">
                      <StockPill product={p} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Pagination */}
            <div className="flex items-center justify-between gap-4 border-t border-border-subtle p-4 text-small text-text-muted">
              <span>
                Showing {start + 1} to {start + pageRows.length} of{" "}
                {products.length}{" "}
                {products.length === 1 ? "product" : "products"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-text-secondary transition-colors hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-text-secondary transition-colors hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>

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

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-border-subtle px-4 py-3 text-caption font-[600] uppercase tracking-[0.04em] text-text-muted",
        align === "right" && "text-right",
        align === "center" && "text-center",
      )}
    >
      {children}
    </th>
  );
}

function StatTile({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <h3 className="text-caption font-[600] uppercase tracking-[0.04em] text-text-muted">
        {label}
      </h3>
      <div className="mt-2 tabular">{children}</div>
    </Card>
  );
}

/** Colored stock pill: in stock / low stock (with count) / out of stock. */
function StockPill({ product }: { product: ProductWithStock }) {
  if (product.totalStock <= 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-danger-50 px-2.5 py-1 text-caption font-[600] text-danger-700">
        Out of stock
      </span>
    );
  }
  if (product.isLowStock) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning-50 px-2.5 py-1 text-caption font-[600] text-warning-700">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
        Low stock ({product.totalStock})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-success-50 px-2.5 py-1 text-caption font-[600] text-success-700">
      {product.totalStock} in stock
    </span>
  );
}
