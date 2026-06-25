"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Money } from "@/components/ui/money";
import { InvoiceStatusBadge } from "@/components/ui/badge";
import { effectiveStatus, INVOICE_FILTERS, type InvoiceFilter } from "@/modules/invoices/status";
import { formatDate, titleCase } from "@/modules/shared/format";
import { cn } from "@/lib/utils";
import type { InvoiceWithCustomer } from "@/modules/invoices/queries";

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

  function pushParams(next: { filter?: InvoiceFilter; q?: string }) {
    const params = new URLSearchParams();
    const f = next.filter ?? filter;
    const q = next.q ?? term;
    if (f && f !== "all") params.set("status", f);
    if (q.trim()) params.set("q", q.trim());
    startTransition(() => {
      router.replace(`/invoices${params.size ? `?${params}` : ""}`);
    });
  }

  const columns: Column<InvoiceWithCustomer>[] = [
    {
      key: "number",
      header: "Invoice",
      hideLabelOnMobile: true,
      cell: (i) => i.invoice_number,
    },
    {
      key: "customer",
      header: "Customer",
      cell: (i) => i.customer?.full_name ?? <span className="text-text-muted">—</span>,
    },
    { key: "date", header: "Date", cell: (i) => formatDate(i.issued_at) },
    {
      key: "status",
      header: "Status",
      cell: (i) => <InvoiceStatusBadge status={effectiveStatus(i)} />,
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      cell: (i) => <Money kobo={i.total} />,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-display">Invoices</h1>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
        {INVOICE_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => pushParams({ filter: f })}
            className={cn(
              "rounded-full px-3 py-1 text-small transition-colors duration-fast",
              filter === f
                ? "bg-primary-600 text-text-on-primary"
                : "bg-gray-100 text-text-secondary hover:bg-gray-200",
            )}
          >
            {f === "all" ? "All" : titleCase(f)}
          </button>
        ))}
      </div>

      <div className="relative max-w-form">
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
          placeholder="Search by invoice number or customer"
          aria-label="Search invoices"
          className="pl-10"
        />
      </div>

      <div aria-busy={pending ? "true" : undefined}>
        <DataTable
          columns={columns}
          rows={invoices}
          rowKey={(i) => i.id}
          onRowClick={(i) => router.push(`/invoices/${i.id}`)}
          emptyState={
            <EmptyState
              icon={FileText}
              title={query || filter !== "all" ? "No matching invoices" : "No invoices yet"}
              description={
                query || filter !== "all"
                  ? "Try a different status or search."
                  : "Record a sale to create your first invoice."
              }
            />
          }
        />
      </div>
    </div>
  );
}
