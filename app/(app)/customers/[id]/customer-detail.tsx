"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { ArrowLeft, FileText, Pencil } from "lucide-react";
import { archiveCustomer } from "@/modules/customers/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { Money } from "@/components/ui/money";
import { InvoiceStatusBadge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/modules/shared/format";
import { CustomerFormModal } from "../customer-form-modal";
import type { Customer, Invoice } from "@/modules/shared/types";
import type { TrustScore, TrustBand } from "@/modules/customers/trust";

export function CustomerDetail({
  customer,
  invoices,
  totalSpend,
  trust,
  canManage,
}: {
  customer: Customer;
  invoices: Invoice[];
  totalSpend: number;
  trust: TrustScore;
  canManage: boolean;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const columns: Column<Invoice>[] = [
    {
      key: "number",
      header: "Invoice",
      hideLabelOnMobile: true,
      cell: (i) => i.invoice_number,
    },
    { key: "date", header: "Date", cell: (i) => formatDate(i.issued_at) },
    { key: "status", header: "Status", cell: (i) => <InvoiceStatusBadge status={i.status} /> },
    {
      key: "total",
      header: "Total",
      align: "right",
      cell: (i) => <Money kobo={i.total} />,
    },
  ];

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => router.push("/customers")}
        className="inline-flex items-center gap-1 text-small text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Customers
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-display">{customer.full_name}</h1>
          <p className="mt-1 text-body text-text-secondary">
            {customer.phone}
            {customer.email ? ` · ${customer.email}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            <Pencil /> Edit
          </Button>
          {canManage && (
            <Button variant="ghost" onClick={() => setArchiveOpen(true)}>
              Archive
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Card className="p-4 sm:p-6">
          <p className="text-caption font-[500] uppercase tracking-[0.04em] text-text-muted">
            Total spend
          </p>
          {/* A fact, not a judgment — neutral per the money color rule. */}
          <p className="mt-2 text-metric tabular text-text-primary">
            <Money kobo={totalSpend} />
          </p>
        </Card>
        <Card className="p-4 sm:p-6">
          <p className="text-caption font-[500] uppercase tracking-[0.04em] text-text-muted">
            Invoices
          </p>
          <p className="mt-2 text-metric tabular text-text-primary">{invoices.length}</p>
        </Card>
        <Card className="p-4 sm:p-6">
          <p className="text-caption font-[500] uppercase tracking-[0.04em] text-text-muted">
            Trust score
          </p>
          <p className="mt-2 flex items-baseline gap-2">
            <span className={`text-metric tabular ${BAND_TEXT[trust.band]}`}>
              {trust.score ?? "—"}
            </span>
            <span className={`text-small font-[600] ${BAND_TEXT[trust.band]}`}>{trust.label}</span>
          </p>
        </Card>
      </div>

      <TrustScoreCard trust={trust} />

      {customer.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-body text-text-secondary">
              {customer.notes}
            </p>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="mb-3 text-h2">Invoices</h2>
        <DataTable
          columns={columns}
          rows={invoices}
          rowKey={(i) => i.id}
          onRowClick={(i) => router.push(`/invoices/${i.id}`)}
          emptyState={
            <EmptyState
              icon={FileText}
              title="No invoices yet"
              description="Record a sale for this customer to create their first invoice."
            />
          }
        />
      </div>

      <CustomerFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        customer={customer}
        onSaved={() => router.refresh()}
      />

      <ArchiveModal
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        customer={customer}
      />
    </div>
  );
}

const BAND_TEXT: Record<TrustBand, string> = {
  excellent: "text-success-700",
  good: "text-success-700",
  fair: "text-warning-700",
  at_risk: "text-danger-700",
  new: "text-text-muted",
};

function TrustScoreCard({ trust }: { trust: TrustScore }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Creditworthiness</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          {trust.factors.map((f) => (
            <div key={f.label} className="flex items-center justify-between gap-4">
              <dt className="text-body text-text-secondary">{f.label}</dt>
              <dd className="text-body-strong text-text-primary">{f.value}</dd>
            </div>
          ))}
        </dl>
        {trust.suggestedCreditKobo > 0 ? (
          <p className="rounded-lg bg-success-50 p-3 text-small text-success-700">
            Based on this history, a credit limit up to{" "}
            <span className="font-[700]">
              <Money kobo={trust.suggestedCreditKobo} />
            </span>{" "}
            looks safe. You decide.
          </p>
        ) : trust.band === "at_risk" ? (
          <p className="rounded-lg bg-danger-50 p-3 text-small text-danger-700">
            Consider requiring upfront payment until their record improves.
          </p>
        ) : trust.band === "new" ? (
          <p className="rounded-lg bg-gray-50 p-3 text-small text-text-muted">
            Not enough history yet to gauge credit. The score builds as they buy and pay.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ArchiveModal({
  open,
  onClose,
  customer,
}: {
  open: boolean;
  onClose: () => void;
  customer: Customer;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(archiveCustomer, null);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.ok) {
      toast("Customer archived");
      router.push("/customers");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="confirm"
      title={`Archive ${customer.full_name}?`}
      description="They'll be hidden from your customer list. Their invoices stay on record."
    >
      <form action={formAction} className="space-y-4">
        {state?.error && <Alert>{state.error}</Alert>}
        <input type="hidden" name="id" value={customer.id} />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton variant="danger">Archive {customer.full_name}</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
