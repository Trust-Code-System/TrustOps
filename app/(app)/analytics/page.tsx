import Link from "next/link";
import { BarChart3, FileDown, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DatePicker } from "@/components/ui/date-picker";
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

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Quick-range presets for the Stitch-style toggle. */
function quickRanges() {
  const now = new Date();
  const to = ymd(now);
  const last7 = { label: "7 days", from: ymd(new Date(Date.now() - 6 * 86_400_000)), to };
  const last30 = { label: "30 days", from: ymd(new Date(Date.now() - 29 * 86_400_000)), to };
  const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const quarter = { label: "This quarter", from: ymd(qStart), to };
  return [last7, last30, quarter];
}

function MiniBars({ points }: { points: DailyPoint[] }) {
  const visible = points.slice(-14);
  const max = maxValue(visible.map((p) => p.revenue));
  return (
    <div className="flex h-56 items-end gap-2 border-b border-border-subtle pt-4">
      {visible.map((p) => {
        const pct = Math.max(4, Math.round((p.revenue / max) * 100));
        return (
          <div key={p.date} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
            <div
              className="w-full rounded-t-sm bg-primary-200 transition-colors group-hover:bg-primary-600"
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

const AVATAR_TONES = [
  "bg-primary-50 text-primary-700",
  "bg-success-50 text-success-700",
  "bg-warning-50 text-warning-700",
  "bg-info-50 text-info-500",
];

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
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
  const maxCustomerSpend = maxValue(data.topCustomers.map((c) => c.spend));
  const maxProductRevenue = maxValue(data.topProducts.map((p) => p.revenue));

  const avgSaleValue =
    data.totals.salesCount > 0
      ? Math.round(data.totals.revenue / data.totals.salesCount)
      : 0;
  const profitMargin =
    data.totals.revenue > 0
      ? Math.round((data.totals.profit / data.totals.revenue) * 100)
      : 0;

  const presets = quickRanges();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-display">Performance Overview</h1>
          <p className="mt-1 text-body text-text-secondary">
            Track your business metrics and growth trends.
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

      {/* Range presets + custom */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" aria-label="Quick ranges">
          {presets.map((p) => {
            const active = data.range.from === p.from && data.range.to === p.to;
            return (
              <Link
                key={p.label}
                href={`/analytics?from=${p.from}&to=${p.to}`}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "rounded-full px-3 py-1.5 text-small font-[600] transition-colors",
                  active
                    ? "bg-primary-600 text-text-on-primary"
                    : "bg-gray-100 text-text-secondary hover:bg-gray-200",
                )}
              >
                {p.label}
              </Link>
            );
          })}
        </div>

        <form className="flex items-end gap-2">
          <div className="w-44">
            <DatePicker name="from" defaultValue={data.range.from} aria-label="From" />
          </div>
          <div className="w-44">
            <DatePicker name="to" defaultValue={data.range.to} aria-label="To" />
          </div>
          <Button type="submit" variant="secondary">
            Apply
          </Button>
        </form>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <MetricCard
          label="Total revenue"
          value={<Money kobo={data.totals.revenue} />}
          delta={data.revenueDelta ?? undefined}
        />
        <MetricCard
          label="Average sale value"
          value={<Money kobo={avgSaleValue} />}
        />
        <MetricCard label="Profit margin" value={`${profitMargin}%`} />
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
          {/* Revenue trend + top clients */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Revenue trend</CardTitle>
              </CardHeader>
              <CardContent>
                <MiniBars points={data.daily} />
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Stat label="Sales" value={data.totals.salesCount} />
                  <Stat label="New customers" value={data.totals.newCustomers} />
                  <Stat label="Cash in" value={<Money kobo={data.totals.cashIn} />} />
                  <Stat label="Cash out" value={<Money kobo={data.totals.cashOut} />} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top clients</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.topCustomers.length === 0 ? (
                  <p className="text-small text-text-muted">
                    No customer sales in this range.
                  </p>
                ) : (
                  data.topCustomers.map((c, i) => (
                    <div
                      key={c.customer_id}
                      className="flex items-center gap-3 border-b border-border-subtle pb-3 last:border-0 last:pb-0"
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-caption font-[600]",
                          AVATAR_TONES[i % AVATAR_TONES.length],
                        )}
                        aria-hidden="true"
                      >
                        {initials(c.customer_name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-small font-[600] text-text-primary">
                          {c.customer_name}
                        </p>
                        <p className="text-caption text-text-muted">
                          {c.invoice_count} invoice{c.invoice_count === 1 ? "" : "s"}
                        </p>
                      </div>
                      <Money kobo={c.spend} className="shrink-0 text-small" />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top performing products */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Top performing products</CardTitle>
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
                      <Th>Product name</Th>
                      <Th align="right">Units sold</Th>
                      <Th align="right">Revenue</Th>
                      <Th>Share</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topProducts.map((p) => {
                      const pct = Math.max(
                        4,
                        Math.round((p.revenue / maxProductRevenue) * 100),
                      );
                      return (
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
                          <td className="px-4 py-3">
                            <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className="h-full rounded-full bg-primary-600"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Outstanding aging + branch comparison */}
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

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-caption uppercase tracking-[0.04em] text-text-muted">
        {label}
      </p>
      <p className="mt-1 text-h2 tabular">{value}</p>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-border-subtle px-4 py-3 text-caption font-[600] uppercase tracking-[0.04em] text-text-muted",
        align === "right" && "text-right",
      )}
    >
      {children}
    </th>
  );
}
