import "server-only";

import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";
import { getSessionContext } from "@/modules/auth/session";
import type { Branch, DailyMetric, Expense } from "@/modules/shared/types";

export type AnalyticsRange = { from: string; to: string };

export type DailyPoint = {
  date: string;
  revenue: number;
  salesCount: number;
  newCustomers: number;
  expenses: number;
  cogs: number;
  profit: number;
};

export type TopProduct = {
  product_id: string;
  product_name: string;
  quantity_sold: number;
  revenue: number;
};

export type TopCustomer = {
  customer_id: string;
  customer_name: string;
  spend: number;
  invoice_count: number;
};

export type AgingBucket = {
  bucket: "0-30" | "31-60" | "60+";
  amount: number;
};

export type BranchPerformance = {
  branchId: string;
  branchName: string;
  revenue: number;
  salesCount: number;
  expenses: number;
  profit: number;
};

export type AnalyticsDashboard = {
  range: AnalyticsRange;
  totals: {
    revenue: number;
    salesCount: number;
    newCustomers: number;
    expenses: number;
    cogs: number;
    profit: number;
    cashIn: number;
    cashOut: number;
    outstanding: number;
  };
  revenueDelta: { direction: "up" | "down"; text: string } | null;
  daily: DailyPoint[];
  topProducts: TopProduct[];
  topCustomers: TopCustomer[];
  aging: AgingBucket[];
  branches: BranchPerformance[];
};

export type ExpenseRow = Expense & {
  branch: { name: string } | null;
  creator: { full_name: string } | null;
};

export type ExpenseList = {
  rows: ExpenseRow[];
  total: number;
  page: number;
  pageSize: number;
};

const DAY_MS = 86_400_000;

export function defaultRange(): AnalyticsRange {
  const to = lagosDateString();
  const from = addDays(to, -29);
  return { from, to };
}

export function normalizeRange(input?: Partial<AnalyticsRange>): AnalyticsRange {
  const fallback = defaultRange();
  const from = input?.from?.match(/^\d{4}-\d{2}-\d{2}$/) ? input.from : fallback.from;
  const to = input?.to?.match(/^\d{4}-\d{2}-\d{2}$/) ? input.to : fallback.to;
  return to >= from ? { from, to } : fallback;
}

function lagosDateString(offsetDays = 0): string {
  const base = new Date(Date.now() + offsetDays * DAY_MS);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base);
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dateSeries(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

function sumPoints(points: DailyPoint[]) {
  const revenue = points.reduce((s, p) => s + p.revenue, 0);
  const salesCount = points.reduce((s, p) => s + p.salesCount, 0);
  const newCustomers = points.reduce((s, p) => s + p.newCustomers, 0);
  const expenses = points.reduce((s, p) => s + p.expenses, 0);
  const cogs = points.reduce((s, p) => s + p.cogs, 0);
  return {
    revenue,
    salesCount,
    newCustomers,
    expenses,
    cogs,
    profit: revenue - cogs - expenses,
    cashIn: revenue,
    cashOut: expenses,
  };
}

function metricToPoint(m: DailyMetric): DailyPoint {
  return {
    date: m.date,
    revenue: m.revenue,
    salesCount: m.sales_count,
    newCustomers: m.new_customers,
    expenses: m.expenses,
    cogs: m.cogs,
    profit: m.revenue - m.cogs - m.expenses,
  };
}

async function liveTodayPoint(today: string): Promise<DailyPoint> {
  const supabase = createClient();
  const start = `${today}T00:00:00+01:00`;
  const tomorrow = `${addDays(today, 1)}T00:00:00+01:00`;

  const [
    { data: payments },
    { count: salesCount },
    { count: newCustomers },
    { data: expenses },
    { data: invoices },
  ] = await Promise.all([
    supabase.from("payments").select("amount").gte("paid_at", start).lt("paid_at", tomorrow),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("issued_at", start)
      .lt("issued_at", tomorrow),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .gte("created_at", start)
      .lt("created_at", tomorrow),
    supabase
      .from("expenses")
      .select("amount")
      .is("deleted_at", null)
      .gte("spent_at", start)
      .lt("spent_at", tomorrow),
    supabase
      .from("invoices")
      .select("id")
      .is("deleted_at", null)
      .gte("issued_at", start)
      .lt("issued_at", tomorrow),
  ]);

  let cogs = 0;
  const invoiceIds = ((invoices as { id: string }[] | null) ?? []).map((i) => i.id);
  if (invoiceIds.length > 0) {
    const { data: items } = await supabase
      .from("invoice_items")
      .select("quantity, product:products(cost_price)")
      .in("invoice_id", invoiceIds)
      .not("product_id", "is", null);
    type Item = { quantity: number; product: { cost_price: number } | null };
    cogs = ((items as unknown as Item[] | null) ?? []).reduce(
      (sum, item) => sum + item.quantity * (item.product?.cost_price ?? 0),
      0,
    );
  }

  const revenue = ((payments as { amount: number }[] | null) ?? []).reduce(
    (s, p) => s + p.amount,
    0,
  );
  const expenseTotal = ((expenses as { amount: number }[] | null) ?? []).reduce(
    (s, e) => s + e.amount,
    0,
  );

  return {
    date: today,
    revenue,
    salesCount: salesCount ?? 0,
    newCustomers: newCustomers ?? 0,
    expenses: expenseTotal,
    cogs,
    profit: revenue - cogs - expenseTotal,
  };
}

async function getCompanyDailyPoints(range: AnalyticsRange): Promise<DailyPoint[]> {
  const supabase = createClient();
  const today = lagosDateString();
  const historicalTo = range.to >= today ? addDays(today, -1) : range.to;

  const map = new Map<string, DailyPoint>();
  if (historicalTo >= range.from) {
    const { data } = await supabase
      .from("daily_metrics")
      .select("*")
      .is("branch_id", null)
      .gte("date", range.from)
      .lte("date", historicalTo)
      .order("date", { ascending: true });

    for (const row of (data as DailyMetric[] | null) ?? []) {
      map.set(row.date, metricToPoint(row));
    }
  }

  if (range.from <= today && range.to >= today) {
    map.set(today, await liveTodayPoint(today));
  }

  return dateSeries(range.from, range.to).map(
    (date) =>
      map.get(date) ?? {
        date,
        revenue: 0,
        salesCount: 0,
        newCustomers: 0,
        expenses: 0,
        cogs: 0,
        profit: 0,
      },
  );
}

async function getOutstandingAging(): Promise<{
  total: number;
  buckets: AgingBucket[];
}> {
  const supabase = createClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, total, due_at")
    .is("deleted_at", null)
    .in("status", ["unpaid", "partial", "overdue"]);

  const rows = (invoices as { id: string; total: number; due_at: string | null }[] | null) ?? [];
  if (rows.length === 0) {
    return {
      total: 0,
      buckets: [
        { bucket: "0-30", amount: 0 },
        { bucket: "31-60", amount: 0 },
        { bucket: "60+", amount: 0 },
      ],
    };
  }

  const { data: payments } = await supabase
    .from("payments")
    .select("invoice_id, amount")
    .in(
      "invoice_id",
      rows.map((r) => r.id),
    );
  const paid = new Map<string, number>();
  for (const p of (payments as { invoice_id: string; amount: number }[] | null) ?? []) {
    paid.set(p.invoice_id, (paid.get(p.invoice_id) ?? 0) + p.amount);
  }

  const now = Date.now();
  const buckets: Record<AgingBucket["bucket"], number> = {
    "0-30": 0,
    "31-60": 0,
    "60+": 0,
  };
  let total = 0;
  for (const inv of rows) {
    const balance = Math.max(0, inv.total - (paid.get(inv.id) ?? 0));
    if (balance <= 0) continue;
    total += balance;
    const days = inv.due_at
      ? Math.max(0, Math.floor((now - new Date(inv.due_at).getTime()) / DAY_MS))
      : 0;
    if (days <= 30) buckets["0-30"] += balance;
    else if (days <= 60) buckets["31-60"] += balance;
    else buckets["60+"] += balance;
  }

  return {
    total,
    buckets: [
      { bucket: "0-30", amount: buckets["0-30"] },
      { bucket: "31-60", amount: buckets["31-60"] },
      { bucket: "60+", amount: buckets["60+"] },
    ],
  };
}

async function getBranchPerformance(range: AnalyticsRange): Promise<BranchPerformance[]> {
  const supabase = createClient();
  const [{ data: branches }, { data: metrics }] = await Promise.all([
    supabase.from("branches").select("*").order("is_primary", { ascending: false }).order("name"),
    supabase
      .from("daily_metrics")
      .select("*")
      .not("branch_id", "is", null)
      .gte("date", range.from)
      .lte("date", range.to),
  ]);
  const branchMap = new Map(
    ((branches as Branch[] | null) ?? []).map((b) => [b.id, b.name]),
  );
  const totals = new Map<string, BranchPerformance>();
  for (const m of (metrics as DailyMetric[] | null) ?? []) {
    if (!m.branch_id) continue;
    const prev =
      totals.get(m.branch_id) ??
      ({
        branchId: m.branch_id,
        branchName: branchMap.get(m.branch_id) ?? "Branch",
        revenue: 0,
        salesCount: 0,
        expenses: 0,
        profit: 0,
      } satisfies BranchPerformance);
    prev.revenue += m.revenue;
    prev.salesCount += m.sales_count;
    prev.expenses += m.expenses;
    prev.profit += m.revenue - m.cogs - m.expenses;
    totals.set(m.branch_id, prev);
  }
  return [...totals.values()].sort((a, b) => b.revenue - a.revenue);
}

async function getAnalyticsDashboardUncached(
  range: AnalyticsRange,
): Promise<AnalyticsDashboard> {
  const supabase = createClient();
  const days = dateSeries(range.from, range.to).length;
  const previous = {
    from: addDays(range.from, -days),
    to: addDays(range.from, -1),
  };

  const [
    daily,
    previousDaily,
    { data: topProducts },
    { data: topCustomers },
    outstanding,
    branches,
  ] = await Promise.all([
    getCompanyDailyPoints(range),
    getCompanyDailyPoints(previous),
    supabase.rpc("analytics_top_products", {
      p_from: range.from,
      p_to: range.to,
      p_limit: 5,
    }),
    supabase.rpc("analytics_top_customers", {
      p_from: range.from,
      p_to: range.to,
      p_limit: 5,
    }),
    getOutstandingAging(),
    getBranchPerformance(range),
  ]);

  const totalsBase = sumPoints(daily);
  const previousTotals = sumPoints(previousDaily);
  const totals = { ...totalsBase, outstanding: outstanding.total };

  let revenueDelta: AnalyticsDashboard["revenueDelta"] = null;
  if (previousTotals.revenue > 0) {
    const pct = Math.round(
      ((totals.revenue - previousTotals.revenue) / previousTotals.revenue) * 100,
    );
    revenueDelta = {
      direction: pct >= 0 ? "up" : "down",
      text: `${Math.abs(pct)}% vs previous period`,
    };
  }

  return {
    range,
    totals,
    revenueDelta,
    daily,
    topProducts: ((topProducts as TopProduct[] | null) ?? []).map((p) => ({
      ...p,
      quantity_sold: Number(p.quantity_sold),
      revenue: Number(p.revenue),
    })),
    topCustomers: ((topCustomers as TopCustomer[] | null) ?? []).map((c) => ({
      ...c,
      spend: Number(c.spend),
      invoice_count: Number(c.invoice_count),
    })),
    aging: outstanding.buckets,
    branches,
  };
}

export async function getAnalyticsDashboard(
  input?: Partial<AnalyticsRange>,
): Promise<AnalyticsDashboard> {
  const ctx = await getSessionContext();
  if (!ctx) throw new Error("Not authenticated");
  const range = normalizeRange(input);
  return unstable_cache(
    () => getAnalyticsDashboardUncached(range),
    ["analytics-dashboard", ctx.profile.company_id, range.from, range.to],
    { revalidate: 60 },
  )();
}

export async function listExpenses(opts: {
  page?: number;
  pageSize?: number;
  category?: string;
  from?: string;
  to?: string;
} = {}): Promise<ExpenseList> {
  const supabase = createClient();
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, opts.pageSize ?? 20));
  const from = opts.from?.match(/^\d{4}-\d{2}-\d{2}$/) ? opts.from : undefined;
  const to = opts.to?.match(/^\d{4}-\d{2}-\d{2}$/) ? opts.to : undefined;

  let query = supabase
    .from("expenses")
    .select("*, branch:branches(name), creator:profiles(full_name)", {
      count: "exact",
    })
    .is("deleted_at", null)
    .order("spent_at", { ascending: false });

  if (opts.category) query = query.eq("category", opts.category);
  if (from) query = query.gte("spent_at", `${from}T00:00:00+01:00`);
  if (to) query = query.lt("spent_at", `${addDays(to, 1)}T00:00:00+01:00`);

  const { data, count } = await query.range((page - 1) * pageSize, page * pageSize - 1);
  return {
    rows: (data as unknown as ExpenseRow[] | null) ?? [],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function listExpenseCategories(): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("expenses")
    .select("category")
    .is("deleted_at", null);
  return [
    ...new Set(
      ((data as { category: string }[] | null) ?? []).map((r) => r.category),
    ),
  ].sort();
}

// ---------------------------------------------------------------------------
// Reports — a period summary the owner/accountant exports to CSV (or prints to
// PDF). Reuses the dashboard aggregate so there is one source of truth, plus an
// expense breakdown by category for the cashflow picture.
// ---------------------------------------------------------------------------

export type ExpenseBreakdownRow = { category: string; amount: number; count: number };

export type ReportData = AnalyticsDashboard & {
  expenseBreakdown: ExpenseBreakdownRow[];
};

export async function getExpenseBreakdown(
  range: AnalyticsRange,
): Promise<ExpenseBreakdownRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("expenses")
    .select("category, amount")
    .is("deleted_at", null)
    .gte("spent_at", `${range.from}T00:00:00+01:00`)
    .lt("spent_at", `${addDays(range.to, 1)}T00:00:00+01:00`);

  const map = new Map<string, ExpenseBreakdownRow>();
  for (const row of (data as { category: string; amount: number }[] | null) ?? []) {
    const prev = map.get(row.category) ?? { category: row.category, amount: 0, count: 0 };
    prev.amount += row.amount;
    prev.count += 1;
    map.set(row.category, prev);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

export async function getReportData(
  input?: Partial<AnalyticsRange>,
): Promise<ReportData> {
  const dashboard = await getAnalyticsDashboard(input);
  const expenseBreakdown = await getExpenseBreakdown(dashboard.range);
  return { ...dashboard, expenseBreakdown };
}

/** Pure CSV serializer for a report. Money is rendered as plain naira decimals
 *  (no ₦ symbol) so spreadsheets treat the column as numeric. */
export function reportToCsv(report: ReportData): string {
  const naira = (kobo: number) => formatNaira(kobo, { withSymbol: false }).replace(/,/g, "");
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const line = (cells: Array<string | number>) => cells.map(esc).join(",");
  const out: string[] = [];

  out.push(line(["TrustOps report"]));
  out.push(line(["Period", report.range.from, "to", report.range.to]));
  out.push("");

  out.push(line(["Summary", "Value (NGN)"]));
  out.push(line(["Revenue", naira(report.totals.revenue)]));
  out.push(line(["Cost of goods sold", naira(report.totals.cogs)]));
  out.push(line(["Expenses", naira(report.totals.expenses)]));
  out.push(line(["Profit", naira(report.totals.profit)]));
  out.push(line(["Cash in", naira(report.totals.cashIn)]));
  out.push(line(["Cash out", naira(report.totals.cashOut)]));
  out.push(line(["Outstanding", naira(report.totals.outstanding)]));
  out.push(line(["Sales count", report.totals.salesCount]));
  out.push(line(["New customers", report.totals.newCustomers]));
  out.push("");

  out.push(line(["Daily", "Revenue (NGN)", "Sales", "New customers", "Expenses (NGN)", "COGS (NGN)", "Profit (NGN)"]));
  for (const p of report.daily) {
    out.push(line([p.date, naira(p.revenue), p.salesCount, p.newCustomers, naira(p.expenses), naira(p.cogs), naira(p.profit)]));
  }
  out.push("");

  out.push(line(["Expenses by category", "Amount (NGN)", "Count"]));
  for (const e of report.expenseBreakdown) {
    out.push(line([e.category, naira(e.amount), e.count]));
  }
  out.push("");

  out.push(line(["Top products", "Quantity sold", "Revenue (NGN)"]));
  for (const p of report.topProducts) {
    out.push(line([p.product_name, p.quantity_sold, naira(p.revenue)]));
  }
  out.push("");

  out.push(line(["Top customers", "Invoices", "Spend (NGN)"]));
  for (const c of report.topCustomers) {
    out.push(line([c.customer_name, c.invoice_count, naira(c.spend)]));
  }
  out.push("");

  out.push(line(["Outstanding aging", "Amount (NGN)"]));
  for (const b of report.aging) {
    out.push(line([`${b.bucket} days`, naira(b.amount)]));
  }
  out.push("");

  out.push(line(["Branch comparison", "Sales", "Revenue (NGN)", "Expenses (NGN)", "Profit (NGN)"]));
  for (const b of report.branches) {
    out.push(line([b.branchName, b.salesCount, naira(b.revenue), naira(b.expenses), naira(b.profit)]));
  }

  return out.join("\n");
}
