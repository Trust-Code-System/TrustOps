"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import { Select } from "@/components/ui/select";
import type { ExpenseList, ExpenseRow } from "@/modules/analytics/queries";
import type { Branch } from "@/modules/shared/types";
import { ExpenseFormModal } from "./expense-form-modal";

type Filters = { category: string; from: string; to: string };

export function ExpensesClient({
  expenses,
  categories,
  branches,
  canManage,
  filters,
}: {
  expenses: ExpenseList;
  categories: string[];
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

  const totalPages = Math.max(1, Math.ceil(expenses.total / expenses.pageSize));
  const columns: Column<ExpenseRow>[] = [
    {
      key: "category",
      header: "Category",
      hideLabelOnMobile: true,
      cell: (e) => (
        <span>
          {e.category}
          {e.description && (
            <span className="ml-2 text-small text-text-muted">{e.description}</span>
          )}
        </span>
      ),
    },
    {
      key: "branch",
      header: "Branch",
      cell: (e) => e.branch?.name ?? <span className="text-text-muted">Company-wide</span>,
    },
    {
      key: "date",
      header: "Date",
      cell: (e) =>
        new Intl.DateTimeFormat("en-NG", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(new Date(e.spent_at)),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (e) => <Money kobo={e.amount} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="space-y-1 sm:w-52">
          <span className="text-caption font-[500] uppercase tracking-[0.04em] text-text-muted">
            Category
          </span>
          <Select
            value={filters.category}
            onChange={(e) => push({ category: e.target.value, page: 1 })}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-1">
          <span className="text-caption font-[500] uppercase tracking-[0.04em] text-text-muted">
            From
          </span>
          <Input
            type="date"
            value={filters.from}
            onChange={(e) => push({ from: e.target.value, page: 1 })}
          />
        </label>
        <label className="space-y-1">
          <span className="text-caption font-[500] uppercase tracking-[0.04em] text-text-muted">
            To
          </span>
          <Input
            type="date"
            value={filters.to}
            onChange={(e) => push({ to: e.target.value, page: 1 })}
          />
        </label>
      </div>

      <div aria-busy={pending ? "true" : undefined}>
        <DataTable
          columns={columns}
          rows={expenses.rows}
          rowKey={(e) => e.id}
          onRowClick={
            canManage
              ? (e) => {
                  setEditing(e);
                  setOpen(true);
                }
              : undefined
          }
          emptyState={
            <EmptyState
              icon={filters.category || filters.from || filters.to ? Search : WalletCards}
              title={
                filters.category || filters.from || filters.to
                  ? "No matching expenses"
                  : "No expenses yet"
              }
              description={
                filters.category || filters.from || filters.to
                  ? "Try a different filter."
                  : "Add your first expense to make profit and cashflow accurate."
              }
              action={
                canManage && !(filters.category || filters.from || filters.to) ? (
                  <Button onClick={openAdd}>Add expense</Button>
                ) : undefined
              }
            />
          }
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-small text-text-muted">
          Page {expenses.page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={expenses.page <= 1}
            onClick={() => push({ page: expenses.page - 1 })}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            disabled={expenses.page >= totalPages}
            onClick={() => push({ page: expenses.page + 1 })}
          >
            Next
          </Button>
        </div>
      </div>

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
