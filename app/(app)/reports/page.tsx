import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Package,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";
import { getReportData, normalizeRange } from "@/modules/analytics/queries";
import { ReportActions } from "./report-actions";

function Row({
  label,
  sub,
  value,
  tone,
}: {
  label: string;
  sub?: string;
  value: number;
  tone?: "neutral" | "negative";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border-subtle pb-3 last:border-0 last:pb-0">
      <div>
        <p className="text-body text-text-secondary">{label}</p>
        {sub && <p className="text-small text-text-muted">{sub}</p>}
      </div>
      <Money kobo={value} tone={tone} />
    </div>
  );
}

/** A KPI tile inside the Period Summary card. */
function SummaryTile({
  label,
  value,
  delta,
  valueTone,
}: {
  label: string;
  value: React.ReactNode;
  delta?: { direction: "up" | "down"; text: string } | null;
  valueTone?: "negative";
}) {
  const DeltaIcon = delta?.direction === "up" ? TrendingUp : TrendingDown;
  return (
    <div className="rounded-md bg-surface-page p-4">
      <p className="text-caption font-[600] uppercase tracking-[0.04em] text-text-muted">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-h1 tabular",
          valueTone === "negative" ? "text-danger-500" : "text-text-primary",
        )}
      >
        {value}
      </p>
      {delta ? (
        <p
          className={cn(
            "mt-1 flex items-center gap-1 text-small",
            delta.direction === "up" ? "text-success-700" : "text-danger-500",
          )}
        >
          <DeltaIcon className="h-4 w-4" aria-hidden="true" />
          {delta.text}
        </p>
      ) : (
        <p className="mt-1 flex items-center gap-1 text-small text-text-muted">
          <Minus className="h-4 w-4" aria-hidden="true" />
          For selected range
        </p>
      )}
    </div>
  );
}

function PrettyDate({ date }: { date: string }) {
  return (
    <>
      {new Intl.DateTimeFormat("en-NG", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(`${date}T00:00:00Z`))}
    </>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const range = normalizeRange(searchParams);
  const data = await getReportData(range);
  const hasActivity =
    data.totals.revenue > 0 ||
    data.totals.expenses > 0 ||
    data.totals.salesCount > 0 ||
    data.totals.newCustomers > 0;

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-display">Reports</h1>
          <p className="mt-1 text-body text-text-secondary">
            Generate and export business insights.
          </p>
        </div>
        <ReportActions from={data.range.from} to={data.range.to} />
      </div>

      <form className="no-print flex flex-col gap-3 rounded-md border border-border-subtle bg-surface-card p-4 sm:flex-row sm:items-end">
        <label className="space-y-1">
          <span className="text-caption font-[500] uppercase tracking-[0.04em] text-text-muted">
            From
          </span>
          <Input type="date" name="from" defaultValue={data.range.from} />
        </label>
        <label className="space-y-1">
          <span className="text-caption font-[500] uppercase tracking-[0.04em] text-text-muted">
            To
          </span>
          <Input type="date" name="to" defaultValue={data.range.to} />
        </label>
        <Button type="submit">Apply range</Button>
      </form>

      <div id="print-area" className="space-y-6">
        <div className="hidden print:block">
          <h1 className="text-h1">TrustOps report</h1>
          <p className="text-body text-text-secondary">
            <PrettyDate date={data.range.from} /> – <PrettyDate date={data.range.to} />
          </p>
        </div>

        {!hasActivity ? (
          <EmptyState
            icon={BarChart3}
            title="Nothing to report for this range"
            description="Record sales, payments, or expenses to build a report."
            action={
              <Link href="/sales/new" className={buttonVariants()}>
                Record sale
              </Link>
            }
          />
        ) : (
          <>
            {/* Period summary + outstanding aging */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Period summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <SummaryTile
                      label="Total revenue"
                      value={<Money kobo={data.totals.revenue} />}
                      delta={data.revenueDelta}
                    />
                    <SummaryTile
                      label="Expenses"
                      value={<Money kobo={data.totals.expenses} />}
                    />
                    <SummaryTile
                      label="Net profit"
                      value={<Money kobo={data.totals.profit} />}
                      valueTone={data.totals.profit < 0 ? "negative" : undefined}
                    />
                    <SummaryTile
                      label="New customers"
                      value={data.totals.newCustomers}
                    />
                  </div>

                  <div className="space-y-3 rounded-md border border-border-subtle p-4">
                    <Row label="Revenue" value={data.totals.revenue} />
                    <Row label="Cost of goods sold" value={data.totals.cogs} />
                    <Row label="Expenses" value={data.totals.expenses} />
                    <Row
                      label="Profit"
                      value={data.totals.profit}
                      tone={data.totals.profit < 0 ? "negative" : "neutral"}
                    />
                    <Row label="Cash in" value={data.totals.cashIn} />
                    <Row label="Cash out" value={data.totals.cashOut} />
                    <Row
                      label="Outstanding"
                      value={data.totals.outstanding}
                      tone={data.totals.outstanding > 0 ? "negative" : "neutral"}
                    />
                    <div className="flex items-baseline justify-between gap-4 pt-1">
                      <p className="text-body text-text-secondary">Sales</p>
                      <p className="tabular text-text-primary">
                        {data.totals.salesCount}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle>Outstanding aging</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <div className="space-y-3">
                    {data.aging.map((b) => (
                      <div
                        key={b.bucket}
                        className="flex items-center justify-between gap-4 rounded-md border border-border-subtle p-3"
                      >
                        <span className="text-body text-text-secondary">
                          {b.bucket} days
                        </span>
                        <Money
                          kobo={b.amount}
                          tone={b.amount > 0 ? "negative" : "neutral"}
                        />
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/invoices?status=overdue"
                    className="no-print mt-auto flex items-center justify-center gap-1 pt-4 text-small font-[600] text-primary-600 hover:underline"
                  >
                    View overdue invoices
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* Top selling products */}
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>
                  <span className="inline-flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary-600" aria-hidden="true" />
                    Top selling products
                  </span>
                </CardTitle>
              </CardHeader>
              {data.topProducts.length === 0 ? (
                <CardContent>
                  <p className="text-small text-text-muted">
                    No product sales in this range.
                  </p>
                </CardContent>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border-b border-border-subtle px-4 py-3 text-caption font-[600] uppercase tracking-[0.04em] text-text-muted">
                          Product
                        </th>
                        <th className="border-b border-border-subtle px-4 py-3 text-right text-caption font-[600] uppercase tracking-[0.04em] text-text-muted">
                          Items sold
                        </th>
                        <th className="border-b border-border-subtle px-4 py-3 text-right text-caption font-[600] uppercase tracking-[0.04em] text-text-muted">
                          Revenue
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topProducts.map((p) => (
                        <tr
                          key={p.product_id}
                          className="border-b border-border-subtle last:border-0"
                        >
                          <td className="px-4 py-3 text-[15px] font-[600] text-text-primary">
                            {p.product_name}
                          </td>
                          <td className="px-4 py-3 text-right tabular text-text-secondary">
                            {p.quantity_sold}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Money kobo={p.revenue} className="text-[15px]" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Expenses by category + Top customers */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Expenses by category</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.expenseBreakdown.length === 0 ? (
                    <p className="text-small text-text-muted">
                      No expenses in this range.
                    </p>
                  ) : (
                    data.expenseBreakdown.map((e) => (
                      <Row
                        key={e.category}
                        label={e.category}
                        sub={`${e.count} item${e.count === 1 ? "" : "s"}`}
                        value={e.amount}
                      />
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top customers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.topCustomers.length === 0 ? (
                    <p className="text-small text-text-muted">
                      No customer sales in this range.
                    </p>
                  ) : (
                    data.topCustomers.map((c) => (
                      <Row
                        key={c.customer_id}
                        label={c.customer_name}
                        sub={`${c.invoice_count} invoice${c.invoice_count === 1 ? "" : "s"}`}
                        value={c.spend}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {data.branches.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Branch comparison</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.branches.map((b) => (
                    <div
                      key={b.branchId}
                      className="flex items-center justify-between gap-4 border-b border-border-subtle pb-3 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="text-body-strong">{b.branchName}</p>
                        <p className="text-small text-text-muted">
                          {b.salesCount} sale{b.salesCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="text-right">
                        <Money kobo={b.revenue} />
                        <p
                          className={cn(
                            "text-small tabular",
                            b.profit < 0 ? "text-danger-500" : "text-text-muted",
                          )}
                        >
                          Profit <Money kobo={b.profit} withSymbol />
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
