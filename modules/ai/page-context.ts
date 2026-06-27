import "server-only";

import { formatNaira } from "@/lib/money";
import {
  getCustomer,
  getCustomerInvoices,
  getCustomerTotalSpend,
} from "@/modules/customers/queries";
import { getInvoiceDetail } from "@/modules/invoices/queries";
import { effectiveStatus } from "@/modules/invoices/status";
import { getProductDetail, listLowStock } from "@/modules/inventory/queries";
import { getReportData, defaultRange } from "@/modules/analytics/queries";
import type { AiSource } from "@/modules/shared/types";

/**
 * Page-aware context for the copilot. The non-negotiable security property: the
 * client only ever sends a *pathname* (a pointer), never page data. The server
 * re-derives the entity here and re-fetches a fresh snapshot through the same
 * RLS-scoped queries the rest of the app uses. A pathname carrying another
 * tenant's id simply returns an empty snapshot — RLS yields nothing — so the
 * copilot can never be fed, or made to leak, data outside the caller's company.
 */

export type PageKind =
  | "customer"
  | "invoice"
  | "product"
  | "dashboard"
  | "analytics"
  | "reports"
  | "expenses"
  | "customers"
  | "invoices"
  | "products"
  | "assistant"
  | "settings"
  | "generic";

export type PageContext = { kind: PageKind; entityId?: string };

export type PageSnapshot = { label: string; summary: string; sources: AiSource[] };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Pure parse of the in-app pathname into a page + optional entity id. */
export function resolvePageContext(pathname: string | null | undefined): PageContext {
  if (!pathname) return { kind: "generic" };
  // Strip query/hash and any leading/trailing slashes, then split.
  const clean = pathname.split(/[?#]/)[0]!.replace(/^\/+|\/+$/g, "");
  const seg = clean.split("/");
  const [first, second] = seg;

  const detail = (kind: PageKind, list: PageKind): PageContext =>
    second && UUID_RE.test(second) ? { kind, entityId: second } : { kind: list };

  switch (first) {
    case "customers":
      return detail("customer", "customers");
    case "invoices":
      return detail("invoice", "invoices");
    case "products":
      return detail("product", "products");
    case "dashboard":
      return { kind: "dashboard" };
    case "analytics":
      return { kind: "analytics" };
    case "reports":
      return { kind: "reports" };
    case "expenses":
      return { kind: "expenses" };
    case "assistant":
      return { kind: "assistant" };
    case "settings":
      return { kind: "settings" };
    default:
      return { kind: "generic" };
  }
}

const naira = (kobo: number) => formatNaira(kobo);

/**
 * Build a small, RLS-scoped snapshot of what the user is currently looking at.
 * Kept deliberately short (a few lines) — it is injected into the system prompt
 * so the copilot can open with a grounded brief and so requests like "message
 * this customer" already know who "this" is.
 */
export async function buildPageSnapshot(ctx: PageContext): Promise<PageSnapshot> {
  switch (ctx.kind) {
    case "customer":
      return ctx.entityId ? customerSnapshot(ctx.entityId) : listSnapshot("customers");
    case "invoice":
      return ctx.entityId ? invoiceSnapshot(ctx.entityId) : listSnapshot("invoices");
    case "product":
      return ctx.entityId ? productSnapshot(ctx.entityId) : listSnapshot("products");
    case "dashboard":
    case "analytics":
    case "reports":
      return overviewSnapshot(ctx.kind);
    default:
      return listSnapshot(ctx.kind);
  }
}

async function customerSnapshot(id: string): Promise<PageSnapshot> {
  const customer = await getCustomer(id);
  if (!customer) return notFound("customer");

  const [invoices, spend] = await Promise.all([
    getCustomerInvoices(id),
    getCustomerTotalSpend(id),
  ]);
  const outstanding = invoices.filter((i) =>
    ["unpaid", "partial", "overdue"].includes(
      effectiveStatus({ status: i.status, due_at: i.due_at, deleted_at: i.deleted_at }),
    ),
  );
  const owed = outstanding.reduce((s, i) => s + i.total, 0);

  const lines = [
    `Customer: ${customer.full_name}${customer.phone ? ` (${customer.phone})` : ""}.`,
    `Total paid to date: ${naira(spend)}. Invoices: ${invoices.length}.`,
    outstanding.length > 0
      ? `Outstanding: ${outstanding.length} invoice(s) totalling about ${naira(owed)}.`
      : "No outstanding balance.",
  ];
  return {
    label: customer.full_name,
    summary: lines.join(" "),
    sources: [
      { tool: "page", label: "Total paid", value: naira(spend) },
      { tool: "page", label: "Outstanding", value: naira(owed) },
    ],
  };
}

async function invoiceSnapshot(id: string): Promise<PageSnapshot> {
  const detail = await getInvoiceDetail(id);
  if (!detail) return notFound("invoice");

  const { invoice, payments } = detail;
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const balance = Math.max(0, invoice.total - paid);
  const status = effectiveStatus({
    status: invoice.status,
    due_at: invoice.due_at,
    deleted_at: invoice.deleted_at,
  });

  const lines = [
    `Invoice ${invoice.invoice_number} for ${invoice.customer?.full_name ?? "unknown customer"}.`,
    `Status: ${status}. Total ${naira(invoice.total)}, paid ${naira(paid)}, balance ${naira(balance)}.`,
    invoice.due_at ? `Due ${invoice.due_at.slice(0, 10)}.` : "No due date set.",
  ];
  return {
    label: `Invoice ${invoice.invoice_number}`,
    summary: lines.join(" "),
    sources: [
      { tool: "page", label: "Balance", value: naira(balance) },
      { tool: "page", label: "Status", value: status },
    ],
  };
}

async function productSnapshot(id: string): Promise<PageSnapshot> {
  const detail = await getProductDetail(id);
  if (!detail) return notFound("product");

  const { product, inventory, totalStock } = detail;
  const low = inventory.filter((r) => r.quantity <= r.low_stock_threshold);
  const lines = [
    `Product: ${product.name}.`,
    `Total stock across branches: ${totalStock}.`,
    low.length > 0
      ? `${low.length} branch(es) at or below the low-stock threshold.`
      : "Stock is healthy at every branch.",
  ];
  return {
    label: product.name,
    summary: lines.join(" "),
    sources: [{ tool: "page", label: "In stock", value: String(totalStock) }],
  };
}

async function overviewSnapshot(kind: PageKind): Promise<PageSnapshot> {
  const d = await getReportData(defaultRange());
  const t = d.totals;
  const lines = [
    `Last 30 days: revenue ${naira(t.revenue)}, profit ${naira(t.profit)}, expenses ${naira(t.expenses)}.`,
    `${t.salesCount} sale(s), ${t.newCustomers} new customer(s).`,
    t.outstanding > 0
      ? `Outstanding receivables: about ${naira(t.outstanding)}.`
      : "No outstanding receivables.",
  ];
  return {
    label: kind === "dashboard" ? "Dashboard" : kind === "analytics" ? "Analytics" : "Reports",
    summary: lines.join(" "),
    sources: [
      { tool: "page", label: "Revenue (30d)", value: naira(t.revenue) },
      { tool: "page", label: "Outstanding", value: naira(t.outstanding) },
    ],
  };
}

const LIST_LABELS: Partial<Record<PageKind, string>> = {
  customers: "Customers",
  invoices: "Invoices",
  products: "Products",
  expenses: "Expenses",
  settings: "Settings",
  assistant: "Assistant",
  generic: "TrustOps",
};

async function listSnapshot(kind: PageKind): Promise<PageSnapshot> {
  // Low stock is the one cross-cutting figure worth surfacing on the products list.
  if (kind === "products") {
    const low = await listLowStock(20);
    return {
      label: "Products",
      summary:
        low.length > 0
          ? `Products list. ${low.length} item(s) are low on stock and may need restocking.`
          : "Products list. Nothing is currently low on stock.",
      sources: [{ tool: "page", label: "Low-stock items", value: String(low.length) }],
    };
  }
  const label = LIST_LABELS[kind] ?? "TrustOps";
  return {
    label,
    summary: `The user is on the ${label} screen.`,
    sources: [],
  };
}

function notFound(entity: string): PageSnapshot {
  return {
    label: "TrustOps",
    summary: `The requested ${entity} is not available to this user.`,
    sources: [],
  };
}
