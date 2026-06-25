import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { MetricCard } from "@/components/ui/metric-card";
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
            A period summary you can export to CSV or save as PDF.
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
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Revenue"
                value={<Money kobo={data.totals.revenue} />}
                delta={data.revenueDelta ?? undefined}
              />
              <MetricCard label="Profit" value={<Money kobo={data.totals.profit} />} />
              <MetricCard label="Expenses" value={<Money kobo={data.totals.expenses} />} />
              <MetricCard
                label="Outstanding"
                value={<Money kobo={data.totals.outstanding} />}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
                  <p className="tabular text-text-primary">{data.totals.salesCount}</p>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-body text-text-secondary">New customers</p>
                  <p className="tabular text-text-primary">{data.totals.newCustomers}</p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Expenses by category</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.expenseBreakdown.length === 0 ? (
                    <p className="text-small text-text-muted">No expenses in this range.</p>
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
                  <CardTitle>Outstanding aging</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.aging.map((b) => (
                    <Row
                      key={b.bucket}
                      label={`${b.bucket} days`}
                      value={b.amount}
                      tone={b.amount > 0 ? "negative" : "neutral"}
                    />
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Top products</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.topProducts.length === 0 ? (
                    <p className="text-small text-text-muted">No product sales in this range.</p>
                  ) : (
                    data.topProducts.map((p) => (
                      <Row
                        key={p.product_id}
                        label={p.product_name}
                        sub={`${p.quantity_sold} sold`}
                        value={p.revenue}
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
                    <p className="text-small text-text-muted">No customer sales in this range.</p>
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
