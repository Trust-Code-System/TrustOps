import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueNotification } from "@/modules/jobs/queue";

/**
 * WhatsApp-native interface — inbound command router.
 *
 * SME owners run their business from WhatsApp: text the bot to check sales,
 * see who owes, or nudge a customer. The sender is identified by their phone
 * (which is on their profile) and EVERY query is scoped to that resolved
 * company_id — same "scope by company explicitly" rule the job handlers use,
 * so one tenant can never read or touch another's data from chat.
 *
 * Replies are free-form text, valid because the user just messaged us (the
 * Meta 24h customer-service window is open).
 */

type Admin = ReturnType<typeof createAdminClient>;

interface Sender {
  userId: string;
  companyId: string;
  role: string;
  fullName: string;
}

/** Last 10 digits — robust to +234/0 prefixes and formatting differences. */
function phoneKey(raw: string): string {
  return raw.replace(/\D/g, "").slice(-10);
}

function naira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG")}`;
}

async function resolveSender(admin: Admin, fromPhone: string): Promise<Sender | null> {
  const key = phoneKey(fromPhone);
  if (key.length < 7) return null;
  const { data } = await admin
    .from("profiles")
    .select("id, company_id, role, full_name, is_active, phone")
    .not("phone", "is", null);
  const rows =
    (data as
      | { id: string; company_id: string; role: string; full_name: string; is_active: boolean; phone: string }[]
      | null) ?? [];
  const match = rows.find((r) => r.is_active && phoneKey(r.phone) === key);
  if (!match) return null;
  return { userId: match.id, companyId: match.company_id, role: match.role, fullName: match.full_name };
}

const HELP = [
  "🤖 *TrustOps* — text me a command:",
  "• *sales* — today's revenue & sales count",
  "• *unpaid* — who still owes you",
  "• *remind INV-0001* — nudge a customer about an invoice",
  "• *help* — show this menu",
].join("\n");

function lagosTodayStartISO(): string {
  const d = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(`${d}T00:00:00+01:00`).toISOString();
}

async function salesToday(admin: Admin, s: Sender): Promise<string> {
  const todayStart = lagosTodayStartISO();
  const [{ data: pays }, { count: salesCount }] = await Promise.all([
    admin.from("payments").select("amount").eq("company_id", s.companyId).gte("paid_at", todayStart),
    admin
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("company_id", s.companyId)
      .gte("issued_at", todayStart)
      .is("deleted_at", null),
  ]);
  const revenue = ((pays as { amount: number }[] | null) ?? []).reduce((sum, p) => sum + p.amount, 0);
  return `📊 *Today*\nRevenue: ${naira(revenue)}\nSales: ${salesCount ?? 0}`;
}

async function unpaid(admin: Admin, s: Sender): Promise<string> {
  const { data: invoices } = await admin
    .from("invoices")
    .select("id, invoice_number, total, customer_id")
    .eq("company_id", s.companyId)
    .in("status", ["unpaid", "partial", "overdue"])
    .is("deleted_at", null);
  const rows =
    (invoices as { id: string; invoice_number: string; total: number; customer_id: string }[] | null) ?? [];
  if (rows.length === 0) return "✅ Nothing outstanding — every invoice is settled.";

  const ids = rows.map((r) => r.id);
  const { data: pays } = await admin.from("payments").select("invoice_id, amount").in("invoice_id", ids);
  const paid = new Map<string, number>();
  for (const p of (pays as { invoice_id: string; amount: number }[] | null) ?? []) {
    paid.set(p.invoice_id, (paid.get(p.invoice_id) ?? 0) + p.amount);
  }
  const balances = rows
    .map((r) => ({ ...r, balance: r.total - (paid.get(r.id) ?? 0) }))
    .filter((r) => r.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  const total = balances.reduce((sum, r) => sum + r.balance, 0);
  const { data: customers } = await admin
    .from("customers")
    .select("id, full_name")
    .in("id", balances.slice(0, 3).map((r) => r.customer_id));
  const custMap = new Map(
    ((customers as { id: string; full_name: string }[] | null) ?? []).map((c) => [c.id, c.full_name]),
  );

  const top = balances
    .slice(0, 3)
    .map((r) => `• ${r.invoice_number} — ${custMap.get(r.customer_id) ?? "Customer"}: ${naira(r.balance)}`)
    .join("\n");
  return `💰 *Outstanding*: ${naira(total)} across ${balances.length} invoice(s)\n${top}`;
}

async function remind(admin: Admin, s: Sender, invoiceNumber: string): Promise<string> {
  if (!["owner", "manager", "accountant"].includes(s.role)) {
    return "Only owners, managers or accountants can send reminders.";
  }
  const { data: inv } = await admin
    .from("invoices")
    .select("id, invoice_number, total, customer_id, status")
    .eq("company_id", s.companyId)
    .ilike("invoice_number", invoiceNumber.trim())
    .is("deleted_at", null)
    .maybeSingle();
  if (!inv) return `Couldn't find invoice "${invoiceNumber}". Try e.g. remind INV-0001.`;
  const invoice = inv as { id: string; invoice_number: string; total: number; customer_id: string; status: string };

  const { data: pays } = await admin.from("payments").select("amount").eq("invoice_id", invoice.id);
  const paid = ((pays as { amount: number }[] | null) ?? []).reduce((sum, p) => sum + p.amount, 0);
  const balance = invoice.total - paid;
  if (balance <= 0) return `${invoice.invoice_number} is already fully paid. 🎉`;

  const [{ data: customer }, { data: company }] = await Promise.all([
    admin.from("customers").select("full_name, phone, email").eq("id", invoice.customer_id).maybeSingle(),
    admin.from("companies").select("name").eq("id", s.companyId).maybeSingle(),
  ]);
  const cust = customer as { full_name: string; phone: string | null; email: string | null } | null;
  const channel = cust?.phone ? "whatsapp" : cust?.email ? "email" : "in_app";

  await enqueueNotification({
    companyId: s.companyId,
    channel,
    template: "invoice_reminder",
    payload: {
      invoice_number: invoice.invoice_number,
      customer_name: cust?.full_name ?? "Customer",
      company_name: (company as { name: string } | null)?.name ?? "TrustOps",
      balance,
      stage: "manual",
    },
    target: channel === "whatsapp" ? cust?.phone ?? null : channel === "email" ? cust?.email ?? null : null,
    dedupeKey: `notif:reminder:${invoice.id}:manual:${Date.now()}`,
  });
  return `📨 Reminder queued for ${invoice.invoice_number} (${cust?.full_name ?? "customer"}) — balance ${naira(balance)}.`;
}

/** Route one inbound text message to a reply. */
export async function handleInboundText(opts: { fromPhone: string; text: string }): Promise<string> {
  const admin = createAdminClient();
  const sender = await resolveSender(admin, opts.fromPhone);
  if (!sender) {
    return "This number isn't linked to a TrustOps account. Ask your admin to add your phone to your staff profile.";
  }

  const text = opts.text.trim();
  const lower = text.toLowerCase();
  const [cmd, ...rest] = text.split(/\s+/);
  const command = cmd.toLowerCase();

  if (["help", "hi", "hello", "menu", "start"].includes(lower)) return HELP;
  if (["sales", "today", "revenue"].includes(command)) return salesToday(admin, sender);
  if (["unpaid", "owing", "outstanding", "debtors"].includes(command)) return unpaid(admin, sender);
  if (command === "remind") {
    if (rest.length === 0) return "Tell me which invoice, e.g. *remind INV-0001*.";
    return remind(admin, sender, rest.join(" "));
  }
  return `I didn't understand that. ${HELP}`;
}
