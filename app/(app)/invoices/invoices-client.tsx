"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronRight as RowChevron,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Money } from "@/components/ui/money";
import { InvoiceStatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  effectiveStatus,
  INVOICE_FILTERS,
  type InvoiceFilter,
} from "@/modules/invoices/status";
import { formatDate, titleCase } from "@/modules/shared/format";
import { cn } from "@/lib/utils";
import type { InvoiceWithCustomer } from "@/modules/invoices/queries";

const PAGE_SIZE = 8;

const FILTER_LABELS: Record<InvoiceFilter, string> = {
  all: "All invoices",
  unpaid: "Unpaid",
  partial: "Partial",
  paid: "Paid",
  overdue: "Overdue",
  archived: "Archived",
};

export function InvoicesClient({
  invoices,
  filter,
  query,
}: {
  invoices: InvoiceWithCustomer[];
  filter: InvoiceFilter;
  query: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [term, setTerm] = useState(query);
  const [page, setPage] = useState(1);

  function pushParams(next: { filter?: InvoiceFilter; q?: string }) {
    const params = new URLSearchParams();
    const f = next.filter ?? filter;
    const q = next.q ?? term;
    if (f && f !== "all") params.set("status", f);
    if (q.trim()) params.set("q", q.trim());
    setPage(1);
    startTransition(() => {
      router.replace(`/invoices${params.size ? `?${params}` : ""}`);
    });
  }

  const totalPages = Math.max(1, Math.ceil(invoices.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = invoices.slice(start, start + PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-display">Invoices</h1>
          <p className="mt-1 text-body text-text-secondary">
            Manage and track customer invoices.
          </p>
        </div>
        <Link href="/sales/new" className={buttonVariants()}>
          <Plus /> New invoice
        </Link>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Filter by status"
        >
          {INVOICE_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => pushParams({ filter: f })}
              className={cn(
                "rounded-full px-3 py-1.5 text-small font-[600] transition-colors duration-fast",
                filter === f
                  ? "bg-primary-600 text-text-on-primary"
                  : "bg-gray-100 text-text-secondary hover:bg-gray-200",
              )}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <Input
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              pushParams({ q: e.target.value });
            }}
            placeholder="Search invoices…"
            aria-label="Search invoices"
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {invoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={
              query || filter !== "all" ? "No matching invoices" : "No invoices yet"
            }
            description={
              query || filter !== "all"
                ? "Try a different status or search."
                : "Record a sale to create your first invoice."
            }
          />
        ) : (
          <div aria-busy={pending ? "true" : undefined}>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="bg-gray-50">
                    <Th>Invoice #</Th>
                    <Th>Customer</Th>
                    <Th>Date</Th>
                    <Th align="right">Amount</Th>
                    <Th>Status</Th>
                    <Th align="center">Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((i) => (
                    <tr
                      key={i.id}
                      onClick={() => router.push(`/invoices/${i.id}`)}
                      className="group cursor-pointer border-b border-border-subtle transition-colors last:border-0 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-[15px] font-[600] text-text-primary">
                        {i.invoice_number}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {i.customer?.full_name ?? (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-small text-text-muted">
                        {formatDate(i.issued_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Money kobo={i.total} className="text-[15px]" />
                      </td>
                      <td className="px-4 py-3">
                        <InvoiceStatusBadge status={effectiveStatus(i)} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <RowChevron
                          className="mx-auto h-5 w-5 text-text-muted opacity-0 transition-opacity group-hover:opacity-100"
                          aria-hidden="true"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-border-subtle sm:hidden">
              {pageRows.map((i) => (
                <li
                  key={i.id}
                  onClick={() => router.push(`/invoices/${i.id}`)}
                  className="flex cursor-pointer items-center justify-between gap-3 p-4 active:bg-gray-50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-[600] text-text-primary">
                        {i.invoice_number}
                      </span>
                      <InvoiceStatusBadge status={effectiveStatus(i)} />
                    </div>
                    <p className="mt-0.5 truncate text-small text-text-muted">
                      {i.customer?.full_name ?? "—"} · {formatDate(i.issued_at)}
                    </p>
                  </div>
                  <Money kobo={i.total} className="shrink-0 text-small" />
                </li>
              ))}
            </ul>

            {/* Pagination */}
            <div className="flex items-center justify-between gap-4 border-t border-border-subtle p-4 text-small text-text-muted">
              <span>
                Showing {start + 1}–{start + pageRows.length} of {invoices.length}{" "}
                {invoices.length === 1 ? "invoice" : "invoices"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                  className="rounded-md border border-border p-1.5 text-text-secondary transition-colors hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="tabular">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                  className="rounded-md border border-border p-1.5 text-text-secondary transition-colors hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>
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
