"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  WalletCards,
  TrendingDown,
  Receipt,
  Tag,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  ExpenseList,
  ExpenseRow,
  ExpenseMetrics,
} from "@/modules/analytics/queries";
import type { Branch } from "@/modules/shared/types";
import { ExpenseFormModal } from "./expense-form-modal";

type Filters = { category: string; from: string; to: string };

export function ExpensesClient({
  expenses,
  categories,
  metrics,
  branches,
  canManage,
  filters,
}: {
  expenses: ExpenseList;
  categories: string[];
  metrics: ExpenseMetrics;
  branches: Branch[];
  canManage: boolean;
  filters: Filters;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [open, setOpen] = useState(false);

  function push(next: Partial<Filters & { page: number }>) {
    const merged = { ...filters, ...next };
    const params = new URLSearchParams();
    if (merged.category) params.set("category", merged.category);
    if (merged.from) params.set("from", merged.from);
    if (merged.to) params.set("to", merged.to);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    startTransition(() => {
      router.replace(`/expenses${params.size ? `?${params}` : ""}`);
    });
  }

  function openAdd() {
    setEditing(null);
    setOpen(true);
  }

  const hasFilters = Boolean(filters.category || filters.from || filters.to);
  const totalPages = Math.max(1, Math.ceil(expenses.total / expenses.pageSize));
  const start = (expenses.page - 1) * expenses.pageSize;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-display">Expenses</h1>
          <p className="mt-1 text-body text-text-secondary">
            Track money out for cashflow and profit reports.
          </p>
        </div>
        {canManage && (
          <Button onClick={openAdd}>
            <Plus /> Add expense
          </Button>
        )}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <MetricTile
          label="Total Expenses (30d)"
          icon={TrendingDown}
          iconTone="danger"
        >
          <Money kobo={metrics.total30d} className="text-metric" />
        </MetricTile>
        <MetricTile
          label="Transactions (30d)"
          icon={Receipt}
          iconTone="primary"
        >
          <span className="text-metric tabular text-text-primary">
            {metrics.count30d}
          </span>
        </MetricTile>
        <MetricTile
          label="Largest Category (30d)"
          icon={Tag}
          iconTone="warning"
          note={
            metrics.largestCategory
              ? `${formatNairaShort(metrics.largestCategory.amount)} · ${metrics.largestCategory.share}%`
              : "No expenses yet"
          }
        >
          <span className="truncate text-metric text-text-primary">
            {metrics.largestCategory?.name ?? "—"}
          </span>
        </MetricTile>
      </div>

      {/* List card */}
      <Card className="overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-border-subtle p-4 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-h3">Recent expenses</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filters.category}
              onChange={(e) => push({ category: e.target.value, page: 1 })}
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
            <Input
              type="date"
              value={filters.from}
              onChange={(e) => push({ from: e.target.value, page: 1 })}
              aria-label="From date"
              className="w-full sm:w-auto"
            />
            <Input
              type="date"
              value={filters.to}
              onChange={(e) => push({ to: e.target.value, page: 1 })}
              aria-label="To date"
              className="w-full sm:w-auto"
            />
          </div>
        </div>

        {/* Body */}
        {expenses.rows.length === 0 ? (
          <EmptyState
            icon={hasFilters ? Search : WalletCards}
            title={hasFilters ? "No matching expenses" : "No expenses yet"}
            description={
              hasFilters
                ? "Try a different filter."
                : "Add your first expense to make profit and cashflow accurate."
            }
            action={
              canManage && !hasFilters ? (
                <Button onClick={openAdd}>Add expense</Button>
              ) : undefined
            }
          />
        ) : (
          <div aria-busy={pending ? "true" : undefined}>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-gray-50">
                    <Th>Date</Th>
                    <Th>Category</Th>
                    <Th>Branch</Th>
                    <Th align="right">Amount</Th>
                    {canManage && <Th align="center">Actions</Th>}
                  </tr>
                </thead>
                <tbody>
                  {expenses.rows.map((e) => (
                    <tr
                      key={e.id}
                      onClick={
                        canManage
                          ? () => {
                              setEditing(e);
                              setOpen(true);
                            }
                          : undefined
                      }
                      className={cn(
                        "group border-b border-border-subtle transition-colors last:border-0",
                        canManage && "cursor-pointer hover:bg-gray-50",
                      )}
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-small text-text-muted">
                        {formatDate(e.spent_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[15px] font-[600] text-text-primary">
                          {e.description || e.category}
                        </div>
                        {e.description && (
                          <div className="mt-0.5 flex items-center gap-1 text-small text-text-muted">
                            <Tag className="h-3 w-3" aria-hidden="true" />
                            {e.category}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-small text-text-secondary">
                        {e.branch?.name ?? "Company-wide"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <span className="tabular text-danger-500">
                          −<Money kobo={e.amount} tone="negative" />
                        </span>
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            aria-label={`Edit ${e.category} expense`}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setEditing(e);
                              setOpen(true);
                            }}
                            className="rounded-md p-1.5 text-text-muted opacity-0 transition-opacity hover:bg-gray-100 hover:text-primary-600 focus:opacity-100 group-hover:opacity-100"
                          >
                            <MoreVertical className="h-5 w-5" aria-hidden="true" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-border-subtle sm:hidden">
              {expenses.rows.map((e) => (
                <li
                  key={e.id}
                  onClick={
                    canManage
                      ? () => {
                          setEditing(e);
                          setOpen(true);
                        }
                      : undefined
                  }
                  className={cn(
                    "flex items-center justify-between gap-3 p-4",
                    canManage && "cursor-pointer active:bg-gray-50",
                  )}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-[600] text-text-primary">
                      {e.description || e.category}
                    </div>
                    <div className="mt-0.5 text-small text-text-muted">
                      {e.category} · {formatDate(e.spent_at)}
                    </div>
                  </div>
                  <span className="shrink-0 tabular text-danger-500">
                    −<Money kobo={e.amount} tone="negative" />
                  </span>
                </li>
              ))}
            </ul>

            {/* Pagination */}
            <div className="flex items-center justify-between gap-4 border-t border-border-subtle p-4 text-small text-text-muted">
              <span>
                Showing {start + 1} to {start + expenses.rows.length} of{" "}
                {expenses.total} {expenses.total === 1 ? "expense" : "expenses"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => push({ page: expenses.page - 1 })}
                  disabled={expenses.page <= 1}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-text-secondary transition-colors hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => push({ page: expenses.page + 1 })}
                  disabled={expenses.page >= totalPages}
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
        <ExpenseFormModal
          key={editing?.id ?? "new"}
          open={open}
          onClose={() => setOpen(false)}
          expense={editing}
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

function MetricTile({
  label,
  icon: Icon,
  iconTone,
  note,
  children,
}: {
  label: string;
  icon: typeof Tag;
  iconTone: "primary" | "danger" | "warning";
  note?: string;
  children: React.ReactNode;
}) {
  const toneClass = {
    primary: "bg-primary-50 text-primary-600",
    danger: "bg-danger-50 text-danger-500",
    warning: "bg-warning-50 text-warning-700",
  }[iconTone];
  return (
    <Card className="flex flex-col justify-between p-6">
      <div className="flex items-start justify-between">
        <span className="text-caption font-[600] uppercase tracking-[0.04em] text-text-muted">
          {label}
        </span>
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full",
            toneClass,
          )}
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-3 tabular">{children}</div>
      {note && <p className="mt-1 text-small text-text-muted">{note}</p>}
    </Card>
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

/** Compact ₦ for the metric note, e.g. ₦2.1M. */
function formatNairaShort(kobo: number): string {
  const n = kobo / 100;
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `₦${Math.round(n / 1_000)}K`;
  return `₦${Math.round(n)}`;
}
