import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Job,
  NotificationChannel,
  NotificationSettings,
} from "@/modules/shared/types";
import { runInsightsJob } from "@/modules/ai/insights";
import { enqueueNotification } from "./queue";

type Admin = ReturnType<typeof createAdminClient>;

/** Start of "today" in Africa/Lagos (WAT, UTC+1, no DST), as ISO. */
function lagosTodayStartISO(): string {
  const d = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(`${d}T00:00:00+01:00`).toISOString();
}
function dayStamp(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(
    new Date(),
  );
}

function defaultSettings(companyId: string): NotificationSettings {
  return {
    company_id: companyId,
    reminders_enabled: true,
    reminder_channel: "in_app",
    reminder_days_before: 3,
    stock_alerts_enabled: true,
    stock_alert_channel: "in_app",
    daily_report_enabled: true,
    daily_report_channel: "in_app",
    receipts_enabled: true,
    receipt_channel: "in_app",
    quiet_hours_start: null,
    quiet_hours_end: null,
    sender_identity: null,
    updated_at: new Date().toISOString(),
  };
}

async function getSettings(admin: Admin, companyId: string): Promise<NotificationSettings> {
  const { data } = await admin
    .from("notification_settings")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();
  return (data as NotificationSettings | null) ?? defaultSettings(companyId);
}

function contactFor(
  channel: NotificationChannel,
  c: { phone?: string | null; email?: string | null },
): string | null {
  if (channel === "whatsapp") return c.phone ?? null;
  if (channel === "email") return c.email ?? null;
  return null; // in_app
}

/** Owner/manager contact for company-facing alerts (reports, stock). */
async function adminContact(admin: Admin, companyId: string) {
  const { data } = await admin
    .from("profiles")
    .select("phone")
    .eq("company_id", companyId)
    .in("role", ["owner", "manager"])
    .order("role")
    .limit(1)
    .maybeSingle();
  return { phone: (data as { phone: string | null } | null)?.phone ?? null, email: null };
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function stockAlert(job: Job) {
  const admin = createAdminClient();
  const companyId = job.company_id;
  if (!companyId) return;
  const settings = await getSettings(admin, companyId);
  if (!settings.stock_alerts_enabled) return;

  const productId = String(job.payload.product_id);
  const branchId = String(job.payload.branch_id);
  const [{ data: product }, { data: branch }, contact] = await Promise.all([
    admin.from("products").select("name").eq("id", productId).maybeSingle(),
    admin.from("branches").select("name").eq("id", branchId).maybeSingle(),
    adminContact(admin, companyId),
  ]);

  await enqueueNotification({
    companyId,
    channel: settings.stock_alert_channel,
    template: "stock_alert",
    payload: {
      product_name: (product as { name: string } | null)?.name ?? "Product",
      branch_name: (branch as { name: string } | null)?.name ?? "Branch",
      quantity: job.payload.quantity,
      threshold: job.payload.threshold,
    },
    target: contactFor(settings.stock_alert_channel, contact),
    dedupeKey: `notif:stock_alert:${productId}:${branchId}:${dayStamp()}`,
  });
}

async function invoiceReminders() {
  const admin = createAdminClient();
  const { data: companies } = await admin.from("companies").select("id, name");
  const now = Date.now();

  for (const company of (companies as { id: string; name: string }[] | null) ?? []) {
    const settings = await getSettings(admin, company.id);
    if (!settings.reminders_enabled) continue;

    const { data: invoices } = await admin
      .from("invoices")
      .select("id, invoice_number, total, due_at, customer_id")
      .eq("company_id", company.id)
      .in("status", ["unpaid", "partial"])
      .is("deleted_at", null)
      .not("due_at", "is", null);

    const rows =
      (invoices as
        | { id: string; invoice_number: string; total: number; due_at: string; customer_id: string }[]
        | null) ?? [];
    if (rows.length === 0) continue;

    // Paid-so-far per invoice → balance.
    const ids = rows.map((r) => r.id);
    const { data: pays } = await admin
      .from("payments")
      .select("invoice_id, amount")
      .in("invoice_id", ids);
    const paid = new Map<string, number>();
    for (const p of (pays as { invoice_id: string; amount: number }[] | null) ?? []) {
      paid.set(p.invoice_id, (paid.get(p.invoice_id) ?? 0) + p.amount);
    }

    const { data: customers } = await admin
      .from("customers")
      .select("id, full_name, phone, email")
      .in("id", rows.map((r) => r.customer_id));
    const custMap = new Map(
      ((customers as { id: string; full_name: string; phone: string; email: string | null }[] | null) ?? []).map(
        (c) => [c.id, c],
      ),
    );

    for (const inv of rows) {
      const due = new Date(inv.due_at).getTime();
      const daysUntil = Math.floor((due - now) / 86_400_000);
      let stage: string | null = null;
      if (due < now) stage = "overdue";
      else if (daysUntil === 0) stage = "due today";
      else if (daysUntil <= settings.reminder_days_before) stage = "due soon";
      if (!stage) continue;

      const cust = custMap.get(inv.customer_id);
      const balance = inv.total - (paid.get(inv.id) ?? 0);
      if (balance <= 0) continue;

      await enqueueNotification({
        companyId: company.id,
        channel: settings.reminder_channel,
        template: "invoice_reminder",
        payload: {
          invoice_number: inv.invoice_number,
          customer_name: cust?.full_name ?? "Customer",
          company_name: company.name,
          balance,
          stage,
        },
        target: cust ? contactFor(settings.reminder_channel, cust) : null,
        // One reminder per invoice per stage per day — cadence guard.
        dedupeKey: `notif:reminder:${inv.id}:${stage}:${dayStamp()}`,
      });
    }
  }
}

async function dailyReport() {
  const admin = createAdminClient();
  const { data: companies } = await admin.from("companies").select("id, name");
  const todayStart = lagosTodayStartISO();

  for (const company of (companies as { id: string; name: string }[] | null) ?? []) {
    const settings = await getSettings(admin, company.id);
    if (!settings.daily_report_enabled) continue;

    const [{ data: todayPays }, { data: openInvoices }, { count: salesCount }] =
      await Promise.all([
        admin.from("payments").select("amount").eq("company_id", company.id).gte("paid_at", todayStart),
        admin.from("invoices").select("id, total").eq("company_id", company.id).in("status", ["unpaid", "partial"]).is("deleted_at", null),
        admin.from("invoices").select("id", { count: "exact", head: true }).eq("company_id", company.id).gte("issued_at", todayStart).is("deleted_at", null),
      ]);

    const revenue = ((todayPays as { amount: number }[] | null) ?? []).reduce((s, p) => s + p.amount, 0);
    const openRows = (openInvoices as { id: string; total: number }[] | null) ?? [];
    let paidOnOpen = 0;
    if (openRows.length > 0) {
      const { data: op } = await admin.from("payments").select("amount").in("invoice_id", openRows.map((r) => r.id));
      paidOnOpen = ((op as { amount: number }[] | null) ?? []).reduce((s, p) => s + p.amount, 0);
    }
    const unpaidTotal = Math.max(0, openRows.reduce((s, r) => s + r.total, 0) - paidOnOpen);

    const { data: lowRows } = await admin
      .from("inventory")
      .select("quantity, low_stock_threshold")
      .eq("company_id", company.id)
      .gt("low_stock_threshold", 0);
    const lowStockCount = ((lowRows as { quantity: number; low_stock_threshold: number }[] | null) ?? []).filter(
      (r) => r.quantity <= r.low_stock_threshold,
    ).length;

    const contact = await adminContact(admin, company.id);
    await enqueueNotification({
      companyId: company.id,
      channel: settings.daily_report_channel,
      template: "daily_report",
      payload: {
        revenue,
        sales_count: salesCount ?? 0,
        unpaid_total: unpaidTotal,
        low_stock_count: lowStockCount,
      },
      target: contactFor(settings.daily_report_channel, contact),
      dedupeKey: `notif:daily_report:${company.id}:${dayStamp()}`,
    });
  }
}

async function receiptDelivery(job: Job) {
  const admin = createAdminClient();
  const companyId = job.company_id;
  if (!companyId) return;
  const settings = await getSettings(admin, companyId);
  if (!settings.receipts_enabled) return;

  const invoiceId = String(job.payload.invoice_id);
  const { data: invoice } = await admin
    .from("invoices")
    .select("invoice_number, total, customer_id")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!invoice) return;
  const inv = invoice as { invoice_number: string; total: number; customer_id: string };

  const [{ data: customer }, { data: company }] = await Promise.all([
    admin.from("customers").select("full_name, phone, email").eq("id", inv.customer_id).maybeSingle(),
    admin.from("companies").select("name").eq("id", companyId).maybeSingle(),
  ]);
  const cust = customer as { full_name: string; phone: string; email: string | null } | null;

  await enqueueNotification({
    companyId,
    channel: settings.receipt_channel,
    template: "receipt",
    payload: {
      invoice_number: inv.invoice_number,
      total: inv.total,
      company_name: (company as { name: string } | null)?.name ?? "TrustOps",
    },
    target: cust ? contactFor(settings.receipt_channel, cust) : null,
    dedupeKey: `notif:receipt:${invoiceId}`,
  });
}

async function overdueTransition() {
  const admin = createAdminClient();
  await admin.rpc("transition_overdue_invoices", {});
}

async function analyticsDailyMetrics() {
  const admin = createAdminClient();
  const today = dayStamp();
  const yesterday = new Date(`${today}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  await admin.rpc("aggregate_daily_metrics", {
    p_from: yesterday.toISOString().slice(0, 10),
    p_to: today,
  });
}

/** Job type → handler. Unknown types throw (→ retried then dead-lettered). */
export const handlers: Record<string, (job: Job) => Promise<void>> = {
  stock_alert: stockAlert,
  invoice_reminders: invoiceReminders,
  daily_report: dailyReport,
  receipt_delivery: receiptDelivery,
  overdue_transition: overdueTransition,
  analytics_daily_metrics: analyticsDailyMetrics,
  ai_insights: () => runInsightsJob(),
};

export async function runHandler(job: Job): Promise<void> {
  const handler = handlers[job.type];
  if (!handler) throw new Error(`No handler for job type "${job.type}"`);
  await handler(job);
}
