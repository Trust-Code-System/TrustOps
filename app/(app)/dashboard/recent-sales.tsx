"use client";

import { useRouter } from "next/navigation";
import { ReceiptText } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Money } from "@/components/ui/money";
import { InvoiceStatusBadge } from "@/components/ui/badge";
import { effectiveStatus } from "@/modules/invoices/status";
import { formatDate } from "@/modules/shared/format";
import type { InvoiceWithCustomer } from "@/modules/invoices/queries";

export function RecentSales({ rows }: { rows: InvoiceWithCustomer[] }) {
  const router = useRouter();

  const columns: Column<InvoiceWithCustomer>[] = [
    {
      key: "customer",
      header: "Customer",
      hideLabelOnMobile: true,
      cell: (i) => i.customer?.full_name ?? i.invoice_number,
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
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(i) => i.id}
      onRowClick={(i) => router.push(`/invoices/${i.id}`)}
      emptyState={
        <EmptyState
          icon={ReceiptText}
          title="No sales yet"
          description="Record your first sale to see it here."
        />
      }
    />
  );
}
