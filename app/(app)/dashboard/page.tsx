import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { MetricCard } from "@/components/ui/metric-card";
import { Money } from "@/components/ui/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/modules/auth/session";
import { getDashboardData } from "@/modules/dashboard/queries";
import { RecentSales } from "./recent-sales";
import { AiInsights } from "./ai-insights";

/**
 * Home / Dashboard (brief #6). Greeting + 3 KPI cards + recent sales.
 * KPI big numbers stay neutral (a fact); only the delta line carries trend
 * color, per the money color rule.
 */
export default async function DashboardPage() {
  const { profile } = await requireSession();
  const firstName = profile.full_name.split(" ")[0] ?? profile.full_name;
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-display">Welcome, {firstName}</h1>
          <p className="mt-1 text-body text-text-secondary">
            Here&apos;s your business at a glance.
          </p>
        </div>
        <Link href="/sales/new" className={buttonVariants({ size: "lg" })}>
          Record sale
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <MetricCard
          label="Today's revenue"
          value={<Money kobo={data.todayRevenue} />}
          delta={data.revenueDelta ?? undefined}
        />
        <MetricCard label="Unpaid total" value={<Money kobo={data.unpaidTotal} />} />
        <MetricCard label="Customers" value={data.customerCount} />
      </div>

      <AiInsights />

      {data.lowStock.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning-500" aria-hidden="true" />
                Low stock
              </span>
            </CardTitle>
            <Link href="/products?low=1" className="text-small font-[600] text-primary-600">
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border-subtle">
              {data.lowStock.map((item) => (
                <li
                  key={`${item.product_id}-${item.branch_name}`}
                  className="flex items-center justify-between gap-4 p-4 sm:px-6"
                >
                  <div>
                    <Link
                      href={`/products/${item.product_id}`}
                      className="text-body text-primary-600"
                    >
                      {item.product_name}
                    </Link>
                    <p className="text-small text-text-muted">{item.branch_name}</p>
                  </div>
                  <Badge tone={item.quantity <= 0 ? "danger" : "warning"}>
                    {item.quantity} left
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-h2">Recent sales</h2>
          {data.hasAnySales && (
            <Link href="/invoices" className="text-small font-[600] text-primary-600">
              View all
            </Link>
          )}
        </div>
        <RecentSales rows={data.recentSales} />
      </section>
    </div>
  );
}
