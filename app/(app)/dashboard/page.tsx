import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Eye,
  ReceiptText,
  Users,
  TrendingUp,
  TrendingDown,
  Package,
  PlusCircle,
  UserPlus,
  WalletCards,
  FileBarChart,
  type LucideIcon,
} from "lucide-react";
import { Money } from "@/components/ui/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/modules/auth/session";
import { getDashboardData } from "@/modules/dashboard/queries";
import { RecentSales } from "./recent-sales";
import { AiInsights } from "./ai-insights";
import { RevenueTrendChart } from "./revenue-trend-chart";

/**
 * Home / Dashboard. Recomposed to match the TrustOps AI Stitch layout:
 * a greeting header, three KPI cards (a dark "Today's Revenue" hero card +
 * two light cards), then a bento grid — revenue trend chart and recent sales
 * on the left, AI insight / low stock / quick actions on the right.
 * All figures stay wired to live data via getDashboardData().
 */
export default async function DashboardPage() {
  const { profile } = await requireSession();
  const firstName = profile.full_name.split(" ")[0] ?? profile.full_name;
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="flex items-center gap-2 text-display">
            {greeting()}, {firstName} <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-1 text-body text-text-secondary">
            Here&apos;s your financial overview for today.
          </p>
        </div>
        <Link
          href="/sales/new"
          className="inline-flex h-10 items-center gap-2 self-start rounded-md bg-primary-600 px-5 text-[15px] font-[600] text-text-on-primary transition-colors hover:bg-primary-700 md:self-auto"
        >
          <PlusCircle className="h-[18px] w-[18px]" aria-hidden="true" />
          Record sale
        </Link>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {/* Today's revenue — brand gradient hero card */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 p-6 shadow-md">
          <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/15 blur-xl" />
          <div className="relative flex items-start justify-between">
            <span className="text-small text-white/80">Today&apos;s Revenue</span>
            <Eye className="h-4 w-4 text-white/70" aria-hidden="true" />
          </div>
          <div className="relative mt-6">
            <Money
              kobo={data.todayRevenue}
              className="text-metric text-white"
            />
            {data.revenueDelta && (
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={
                    "inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-caption font-[600] " +
                    (data.revenueDelta.direction === "up"
                      ? "text-success-500"
                      : "text-danger-500")
                  }
                >
                  {data.revenueDelta.direction === "up" ? (
                    <TrendingUp className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <TrendingDown className="h-3 w-3" aria-hidden="true" />
                  )}
                  {data.revenueDelta.text}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Unpaid invoices */}
        <KpiCard
          label="Unpaid Invoices"
          icon={ReceiptText}
          dot="danger"
          value={<Money kobo={data.unpaidTotal} />}
          footer="Needs attention"
        />

        {/* Total customers */}
        <KpiCard
          label="Total Customers"
          icon={Users}
          value={data.customerCount.toLocaleString()}
          footer="Across all segments"
        />
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: chart + recent sales */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <CardTitle>Revenue Trend</CardTitle>
              <span className="text-small text-text-muted">This Week</span>
            </div>
            <RevenueTrendChart data={data.revenueTrend} />
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
              {data.hasAnySales && (
                <Link
                  href="/invoices"
                  className="text-small font-[600] text-primary-600 hover:underline"
                >
                  View All
                </Link>
              )}
            </CardHeader>
            <CardContent>
              <RecentSales rows={data.recentSales} />
            </CardContent>
          </Card>
        </div>

        {/* Right: AI insight, low stock, quick actions */}
        <div className="flex flex-col gap-6">
          <AiInsights />

          {data.lowStock.length > 0 && (
            <Card className="p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className="h-5 w-5 text-warning-500"
                  aria-hidden="true"
                />
                <CardTitle>Low Stock</CardTitle>
              </div>
              <ul className="mt-4 flex flex-col gap-3">
                {data.lowStock.map((item) => (
                  <li
                    key={`${item.product_id}-${item.branch_name}`}
                    className="flex items-center justify-between gap-4 rounded-md border border-border-subtle p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 text-text-muted">
                        <Package className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <Link
                          href={`/products/${item.product_id}`}
                          className="text-small font-[600] text-text-primary hover:text-primary-600"
                        >
                          {item.product_name}
                        </Link>
                        <p className="text-caption text-text-muted">
                          {item.quantity} units left · {item.branch_name}
                        </p>
                      </div>
                    </div>
                    <Badge tone={item.quantity <= 0 ? "danger" : "warning"}>
                      {item.quantity <= 0 ? "Out" : "Restock"}
                    </Badge>
                  </li>
                ))}
              </ul>
              <Link
                href="/products?low=1"
                className="mt-4 block rounded-md py-2 text-center text-small font-[600] text-primary-600 transition-colors hover:bg-primary-50"
              >
                Manage Inventory
              </Link>
            </Card>
          )}

          <Card className="p-4 sm:p-6">
            <CardTitle>Quick Actions</CardTitle>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <QuickAction
                href="/sales/new"
                icon={PlusCircle}
                label="Create Invoice"
                tone="primary"
              />
              <QuickAction
                href="/customers"
                icon={UserPlus}
                label="Add Customer"
                tone="success"
              />
              <QuickAction
                href="/expenses"
                icon={WalletCards}
                label="Record Expense"
                tone="warning"
              />
              <QuickAction
                href="/reports"
                icon={FileBarChart}
                label="Generate Report"
                tone="neutral"
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** Greeting keyed to the current hour in Lagos. */
function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Lagos",
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Light KPI card with a label, optional status dot, value, and footer note. */
function KpiCard({
  label,
  icon: Icon,
  value,
  footer,
  dot,
}: {
  label: string;
  icon: LucideIcon;
  value: ReactNode;
  footer: string;
  dot?: "danger";
}) {
  return (
    <Card className="flex flex-col justify-between p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {dot && (
            <span className="h-2 w-2 rounded-full bg-danger-500" aria-hidden="true" />
          )}
          <span className="text-small text-text-secondary">{label}</span>
        </div>
        <Icon className="h-4 w-4 text-text-muted" aria-hidden="true" />
      </div>
      <div className="mt-6">
        <p className="text-metric tabular text-text-primary">{value}</p>
        <p className="mt-3 text-caption text-text-muted">{footer}</p>
      </div>
    </Card>
  );
}

/** Square quick-action tile linking to a primary task. */
function QuickAction({
  href,
  icon: Icon,
  label,
  tone,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  tone: "primary" | "success" | "warning" | "neutral";
}) {
  const toneClass = {
    primary: "bg-primary-50 text-primary-600",
    success: "bg-success-50 text-success-700",
    warning: "bg-warning-50 text-warning-700",
    neutral: "bg-gray-100 text-text-secondary",
  }[tone];
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-2 rounded-md border border-border-subtle bg-surface-page p-4 text-center transition-colors hover:bg-gray-100"
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-full ${toneClass}`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="text-caption font-[600] text-text-primary">{label}</span>
    </Link>
  );
}
