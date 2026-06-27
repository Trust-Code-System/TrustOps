import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getPublicInvoice } from "@/modules/payments/public";
import { PayButton } from "./pay-button";

export const metadata: Metadata = { title: "Pay invoice · TrustOps" };
// Always reflect the latest payment state (no caching of a stale balance).
export const dynamic = "force-dynamic";

function naira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG")}`;
}

export default async function PublicInvoicePage({
  params,
}: {
  params: { reference: string };
}) {
  const inv = await getPublicInvoice(decodeURIComponent(params.reference));
  if (!inv) notFound();

  const isPaid = inv.balance <= 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 p-4 sm:p-6">
      <div className="rounded-2xl border border-border-subtle bg-surface-raised p-6 shadow-sm sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-small text-text-muted">{inv.company_name}</p>
            <h1 className="text-display">{inv.invoice_number}</h1>
            <p className="mt-1 text-body text-text-secondary">Billed to {inv.customer_name}</p>
          </div>
          {isPaid && (
            <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-3 py-1 text-small text-success-700">
              <CheckCircle2 className="h-4 w-4" /> Paid
            </span>
          )}
        </div>

        <div className="mt-6 divide-y divide-border-subtle border-y border-border-subtle">
          {inv.items.map((it, i) => (
            <div key={i} className="flex items-start justify-between gap-4 py-3">
              <div>
                <p className="text-body">{it.description}</p>
                <p className="text-small text-text-muted">
                  {it.quantity} × {naira(it.unit_price)}
                </p>
              </div>
              <span className="text-body-strong tabular">{naira(it.line_total)}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <Row label="Subtotal" value={naira(inv.subtotal)} />
          {inv.discount > 0 && <Row label="Discount" value={`−${naira(inv.discount)}`} />}
          <Row label="Total" value={naira(inv.total)} strong />
          {inv.paid > 0 && <Row label="Paid" value={naira(inv.paid)} />}
          <Row label={isPaid ? "Balance" : "Amount due"} value={naira(inv.balance)} strong />
        </div>

        <div className="mt-6">
          {isPaid ? (
            <p className="rounded-lg bg-success-50 p-4 text-center text-body text-success-700">
              This invoice is fully paid. Thank you! 🎉
            </p>
          ) : (
            <PayButton
              reference={inv.reference}
              provider={inv.provider}
              authorizationUrl={inv.authorization_url}
              balance={inv.balance}
            />
          )}
        </div>
      </div>
      <p className="text-center text-small text-text-muted">Secured by TrustOps</p>
    </main>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={strong ? "text-body-strong" : "text-body text-text-secondary"}>{label}</span>
      <span className={`tabular ${strong ? "text-body-strong" : "text-body"}`}>{value}</span>
    </div>
  );
}
