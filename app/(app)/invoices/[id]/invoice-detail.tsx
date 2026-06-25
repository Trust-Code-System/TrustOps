"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { recordPayment, archiveInvoice } from "@/modules/invoices/actions";
import { sendReceipt } from "@/modules/notifications/actions";
import { effectiveStatus } from "@/modules/invoices/status";
import { nairaToKobo, formatNaira } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Money } from "@/components/ui/money";
import { InvoiceStatusBadge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatDateTime, titleCase } from "@/modules/shared/format";
import type { InvoiceDetail } from "@/modules/invoices/queries";

export function InvoiceDetailView({
  detail,
  canArchive,
}: {
  detail: InvoiceDetail;
  canArchive: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { invoice, items, payments } = detail;

  const [payOpen, setPayOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [sendingReceipt, setSendingReceipt] = useState(false);

  async function handleSendReceipt() {
    setSendingReceipt(true);
    const res = await sendReceipt(invoice.id);
    setSendingReceipt(false);
    toast(res.ok ? "Receipt queued for delivery" : res.error ?? "Could not queue receipt", res.ok ? "success" : "error");
  }

  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const balance = Math.max(0, invoice.total - paid);
  const status = effectiveStatus(invoice);
  const isArchived = status === "archived";
  const canPay = !isArchived && balance > 0;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => router.push("/invoices")}
        className="inline-flex items-center gap-1 text-small text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Invoices
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-display">{invoice.invoice_number}</h1>
            <InvoiceStatusBadge status={status} />
          </div>
          <p className="mt-1 text-body text-text-secondary">
            {invoice.customer ? (
              <Link href={`/customers/${invoice.customer.id}`} className="text-primary-600">
                {invoice.customer.full_name}
              </Link>
            ) : (
              "—"
            )}{" "}
            · Issued {formatDate(invoice.issued_at)}
            {invoice.due_at ? ` · Due ${formatDate(invoice.due_at)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canPay && <Button onClick={() => setPayOpen(true)}>Record payment</Button>}
          <Button variant="secondary" onClick={handleSendReceipt} isLoading={sendingReceipt}>
            <Send /> Send receipt
          </Button>
          {canArchive && !isArchived && (
            <Button variant="ghost" onClick={() => setArchiveOpen(true)}>
              Archive
            </Button>
          )}
        </div>
      </div>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border-subtle">
            {items.map((it) => (
              <div key={it.id} className="flex items-start justify-between gap-4 p-4 sm:px-6">
                <div>
                  <p className="text-body">{it.description}</p>
                  <p className="text-small text-text-muted">
                    {it.quantity} × <Money kobo={it.unit_price} withSymbol={false} />
                  </p>
                </div>
                <Money kobo={it.line_total} className="text-body-strong" />
              </div>
            ))}
          </div>
          {/* Totals */}
          <div className="space-y-2 border-t border-border-subtle p-4 sm:px-6">
            <Row label="Subtotal" value={<Money kobo={invoice.subtotal} />} />
            {invoice.discount > 0 && (
              <Row
                label="Discount"
                value={
                  <span className="tabular">
                    −<Money kobo={invoice.discount} />
                  </span>
                }
              />
            )}
            <Row
              label="Total"
              value={<Money kobo={invoice.total} className="text-body-strong" />}
              strong
            />
            <Row label="Paid" value={<Money kobo={paid} tone={paid > 0 ? "positive" : "neutral"} />} />
            <Row
              label="Balance due"
              value={<Money kobo={balance} tone={balance > 0 ? "negative" : "neutral"} />}
              strong
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment history */}
      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
        </CardHeader>
        <CardContent className={payments.length === 0 ? "p-0" : "p-0"}>
          {payments.length === 0 ? (
            <EmptyState
              icon={Send}
              title="No payments yet"
              description="Record a payment to update this invoice's status."
            />
          ) : (
            <ul className="divide-y divide-border-subtle">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 p-4 sm:px-6">
                  <div>
                    <p className="text-body capitalize">{p.method}</p>
                    <p className="text-small text-text-muted">
                      {formatDateTime(p.paid_at)}
                      {p.reference ? ` · ${p.reference}` : ""}
                    </p>
                  </div>
                  <Money kobo={p.amount} tone="positive" />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {canPay && (
        <RecordPaymentModal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          invoiceId={invoice.id}
          balance={balance}
          onDone={() => router.refresh()}
        />
      )}

      <ArchiveInvoiceModal
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoice_number}
      />
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={strong ? "text-body-strong" : "text-body text-text-secondary"}>
        {label}
      </span>
      <span>{value}</span>
    </div>
  );
}

function RecordPaymentModal({
  open,
  onClose,
  invoiceId,
  balance,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  invoiceId: string;
  balance: number;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toKobo(v: string): number {
    if (!v.trim()) return balance; // default to the full balance
    try {
      return nairaToKobo(v);
    } catch {
      return 0;
    }
  }

  async function submit() {
    setError(null);
    const amountKobo = toKobo(amount);
    if (amountKobo <= 0) return setError("Enter an amount greater than zero");

    setSaving(true);
    const res = await recordPayment({
      invoiceId,
      amountKobo,
      method: method as "cash" | "transfer" | "card" | "other",
      reference: reference.trim() || null,
    });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    toast("Payment recorded");
    onDone();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Record payment">
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <FormField id="amount" label="Amount" helper={`Balance due: ${formatNaira(balance)}`}>
          <Input
            type="text"
            inputMode="decimal"
            leadingAddon="₦"
            numeric
            placeholder={formatNaira(balance, { withSymbol: false })}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </FormField>
        <FormField id="method" label="Method">
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="cash">Cash</option>
            <option value="transfer">Transfer</option>
            <option value="card">Card</option>
            <option value="other">Other</option>
          </Select>
        </FormField>
        <FormField id="reference" label="Reference">
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" />
        </FormField>
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} isLoading={saving}>
            Record payment
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ArchiveInvoiceModal({
  open,
  onClose,
  invoiceId,
  invoiceNumber,
}: {
  open: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError(null);
    setSaving(true);
    const res = await archiveInvoice(invoiceId);
    setSaving(false);
    if (!res.ok) return setError(res.error);
    toast("Invoice archived");
    router.push("/invoices");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="confirm"
      title={`Archive invoice ${invoiceNumber}?`}
      description="It will be hidden from the active list but stays on record."
    >
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={submit} isLoading={saving}>
            Archive {invoiceNumber}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
