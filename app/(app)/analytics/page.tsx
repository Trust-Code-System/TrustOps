import Link from "next/link";
import { BarChart3, FileDown, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { MetricCard } from "@/components/ui/metric-card";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";
import {
  getAnalyticsDashboard,
  normalizeRange,
  type DailyPoint,
} from "@/modules/analytics/queries";

function maxValue(values: number[]) {
  return Math.max(1, ...values);
}

function ShortDate({ date }: { date: string }) {
  return (
    <span>
      {new Intl.DateTimeFormat("en-NG", {
        month: "short",
        day: "numeric",
      }).format(new Date(`${date}T00:00:00Z`))}
    </span>
  );
}

function MiniBars({ points }: { points: DailyPoint[] }) {
  const visible = points.slice(-14);
  const max = maxValue(visible.map((p) => p.revenue));
  return (
    <div className="flex h-48 items-end gap-2 border-b border-border-subtle pt-4">
      {visible.map((p) => {
        const pct = Math.max(4, Math.round((p.revenue / max) * 100));
        return (
          <div key={p.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div
              className="w-full rounded-sm bg-primary-600"
              style={{ height: `${pct}%` }}
              title={`${p.date}: ${p.revenue}`}
            />
            <span className="hidden text-caption text-text-muted sm:inline">
              <ShortDate date={p.date} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ProgressRow({
  label,
  value,
  max,
  sub,
}: {
  label: string;
  value: number;
  max: number;
  sub?: string;
}) {
  const pct = Math.max(2, Math.round((value / Math.max(1, max)) * 100));
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="text-body-strong text-text-primary">{label}</p>
          {sub && <p className="text-small text-text-muted">{sub}</p>}
        </div>
        <Money kobo={value} />
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-primary-600" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const range = normalizeRange(searchParams);
  const data = await getAnalyticsDashboard(range);
  const hasActivity = data.daily.some(
    (p) => p.revenue || p.salesCount || p.expenses || p.newCustomers,
  );
  const maxProductRevenue = maxValue(data.topProducts.map((p) => p.revenue));
  const maxCustomerSpend = maxValue(data.topCustomers.map((c) => c.spend));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-display">Analytics</h1>
          <p className="mt-1 text-body text-text-secondary">
            Revenue, profit, customers, cashflow, and outstanding balances.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/expenses" className={buttonVariants({ variant: "secondary" })}>
            <WalletCards /> Expenses
          </Link>
          <Link
            href={`/reports?from=${data.range.from}&to=${data.range.to}`}
            className={buttonVariants()}
          >
            <FileDown /> Export
          </Link>
        </div>
      </div>

      <form className="flex flex-col gap-3 rounded-md border border-border-subtle bg-surface-card p-4 sm:flex-row sm:items-end">
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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Revenue"
          value={<Money kobo={data.totals.revenue} />}
          delta={data.revenueDelta ?? undefined}
        />
        <MetricCard label="Profit" value={<Money kobo={data.totals.profit} />} />
        <MetricCard label="Expenses" value={<Money kobo={data.totals.expenses} />} />
        <MetricCard label="Outstanding" value={<Money kobo={data.totals.outstanding} />} />
      </div>

      {!hasActivity ? (
        <EmptyState
          icon={BarChart3}
          title="No analytics for this range"
          description="Record sales, payments, or expenses to populate this dashboard."
          action={<Link href="/sales/new" className={buttonVariants()}>Record sale</Link>}
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Revenue over time</CardTitle>
            </CardHeader>
            <CardContent>
              <MiniBars points={data.daily} />
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-caption uppercase tracking-[0.04em] text-text-muted">
                    Sales
                  </p>
                  <p className="mt-1 text-h2 tabular">{data.totals.salesCount}</p>
                </div>
                <div>
                  <p className="text-caption uppercase tracking-[0.04em] text-text-muted">
                    New customers
                  </p>
                  <p className="mt-1 text-h2 tabular">{data.totals.newCustomers}</p>
                </div>
                <div>
                  <p className="text-caption uppercase tracking-[0.04em] text-text-muted">
                    Cash in
                  </p>
                  <p className="mt-1 text-h2 tabular">
                    <Money kobo={data.totals.cashIn} />
                  </p>
                </div>
                <div>
                  <p className="text-caption uppercase tracking-[0.04em] text-text-muted">
                    Cash out
                  </p>
                  <p className="mt-1 text-h2 tabular">
                    <Money kobo={data.totals.cashOut} />
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top products</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.topProducts.length === 0 ? (
                  <p className="text-small text-text-muted">No product sales in this range.</p>
                ) : (
                  data.topProducts.map((p) => (
                    <ProgressRow
                      key={p.product_id}
                      label={p.product_name}
                      value={p.revenue}
                      max={maxProductRevenue}
                      sub={`${p.quantity_sold} sold`}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top customers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.topCustomers.length === 0 ? (
                  <p className="text-small text-text-muted">No customer sales in this range.</p>
                ) : (
                  data.topCustomers.map((c) => (
                    <ProgressRow
                      key={c.customer_id}
                      label={c.customer_name}
                      value={c.spend}
                      max={maxCustomerSpend}
                      sub={`${c.invoice_count} invoice${c.invoice_count === 1 ? "" : "s"}`}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Outstanding aging</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.aging.map((b) => (
                  <div key={b.bucket} className="flex items-center justify-between gap-4">
                    <span className="text-body text-text-secondary">{b.bucket} days</span>
                    <Money kobo={b.amount} tone={b.amount > 0 ? "negative" : "neutral"} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Branch comparison</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.branches.length === 0 ? (
                  <p className="text-small text-text-muted">No branch activity in this range.</p>
                ) : (
                  data.branches.map((b) => (
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
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
