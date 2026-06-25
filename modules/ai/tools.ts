import "server-only";

import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";
import {
  defaultRange,
  getReportData,
  normalizeRange,
  type AnalyticsRange,
} from "@/modules/analytics/queries";
import { listLowStock } from "@/modules/inventory/queries";
import { listCustomers, getCustomerTotalSpend } from "@/modules/customers/queries";
import type { AiSource } from "@/modules/shared/types";

/**
 * The assistant's tool surface. Each tool maps to an already-RLS-scoped query
 * (Phases 1–5) — the model never gets raw SQL or DB access, and every call runs
 * under the requesting user's company_id via the same server client as the rest
 * of the app. The model cannot widen its own scope. (Master spec, Phase 6 rule 1.)
 */

export type ToolResult = { content: string; sources: AiSource[] };

type Json = Record<string, unknown>;

function asRange(input: Json): AnalyticsRange {
  const from = typeof input.from === "string" ? input.from : undefined;
  const to = typeof input.to === "string" ? input.to : undefined;
  return from || to ? normalizeRange({ from, to }) : defaultRange();
}

function clampLimit(input: Json, fallback = 5): number {
  const n = Number(input.limit);
  return Number.isFinite(n) ? Math.min(20, Math.max(1, Math.trunc(n))) : fallback;
}

const naira = (kobo: number) => formatNaira(kobo);

// --- Tool definitions (Anthropic input_schema shape) -----------------------

export const aiToolDefs = [
  {
    name: "get_financial_summary",
    description:
      "Revenue, profit, expenses, COGS, cash in/out, outstanding balance, sales count and new customers for a date range. Defaults to the last 30 days. Use for 'how much did I make', revenue/profit/cashflow questions.",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Start date YYYY-MM-DD (optional)" },
        to: { type: "string", description: "End date YYYY-MM-DD (optional)" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_top_products",
    description: "Best-selling products by revenue (with quantity sold) for a date range. Use for 'what sells best'.",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string" },
        to: { type: "string" },
        limit: { type: "integer", description: "How many to return (1–20, default 5)" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_top_customers",
    description: "Top customers by spend (with invoice count) for a date range. Use for 'who are my best customers'.",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string" },
        to: { type: "string" },
        limit: { type: "integer" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_unpaid_invoices",
    description: "Invoices with an outstanding balance (unpaid, partial, or overdue), newest first, with the amount still owed and aging totals. Use for 'who owes me money'.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_low_stock",
    description: "Products at or below their low-stock threshold, by branch. Use for 'what's low on stock' / 'what do I need to restock'.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "find_customer",
    description: "Look up customers by name or phone, with their total spend. Use to answer questions about a specific customer.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "Name or phone fragment" } },
      required: ["query"],
      additionalProperties: false,
    },
  },
] as const;

export const aiToolNames = aiToolDefs.map((t) => t.name);

// --- Executors -------------------------------------------------------------

async function unpaidInvoices(): Promise<ToolResult> {
  const supabase = createClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, total, due_at, status, customer:customers(full_name)")
    .is("deleted_at", null)
    .in("status", ["unpaid", "partial", "overdue"])
    .order("issued_at", { ascending: false })
    .limit(50);

  type Row = {
    id: string;
    invoice_number: string;
    total: number;
    due_at: string | null;
    status: string;
    customer: { full_name: string } | null;
  };
  const rows = (invoices as unknown as Row[] | null) ?? [];
  if (rows.length === 0) {
    return { content: JSON.stringify({ invoices: [], total_outstanding: 0 }), sources: [] };
  }

  const { data: pays } = await supabase
    .from("payments")
    .select("invoice_id, amount")
    .in("invoice_id", rows.map((r) => r.id));
  const paid = new Map<string, number>();
  for (const p of (pays as { invoice_id: string; amount: number }[] | null) ?? []) {
    paid.set(p.invoice_id, (paid.get(p.invoice_id) ?? 0) + p.amount);
  }

  let totalOutstanding = 0;
  const out = rows
    .map((r) => {
      const balanceKobo = Math.max(0, r.total - (paid.get(r.id) ?? 0));
      return { r, balanceKobo };
    })
    .filter((x) => x.balanceKobo > 0)
    .slice(0, 20)
    .map(({ r, balanceKobo }) => {
      totalOutstanding += balanceKobo;
      return {
        invoice_number: r.invoice_number,
        customer: r.customer?.full_name ?? "Unknown",
        status: r.status,
        balance: naira(balanceKobo),
        due: r.due_at ? r.due_at.slice(0, 10) : null,
      };
    });

  return {
    content: JSON.stringify({ invoices: out, count: out.length, total_outstanding: naira(totalOutstanding) }),
    sources: [{ tool: "get_unpaid_invoices", label: "Outstanding", value: naira(totalOutstanding) }],
  };
}

async function lowStock(): Promise<ToolResult> {
  const rows = await listLowStock(20);
  return {
    content: JSON.stringify({
      low_stock: rows.map((r) => ({
        product: r.product_name,
        branch: r.branch_name,
        quantity: r.quantity,
        threshold: r.low_stock_threshold,
      })),
      count: rows.length,
    }),
    sources: [{ tool: "get_low_stock", label: "Low-stock items", value: String(rows.length) }],
  };
}

async function financialSummary(input: Json): Promise<ToolResult> {
  const range = asRange(input);
  const d = await getReportData(range);
  const t = d.totals;
  return {
    content: JSON.stringify({
      range: d.range,
      revenue: naira(t.revenue),
      profit: naira(t.profit),
      expenses: naira(t.expenses),
      cogs: naira(t.cogs),
      cash_in: naira(t.cashIn),
      cash_out: naira(t.cashOut),
      outstanding: naira(t.outstanding),
      sales_count: t.salesCount,
      new_customers: t.newCustomers,
    }),
    sources: [
      { tool: "get_financial_summary", label: "Revenue", value: naira(t.revenue) },
      { tool: "get_financial_summary", label: "Profit", value: naira(t.profit) },
    ],
  };
}

async function topProducts(input: Json): Promise<ToolResult> {
  const range = asRange(input);
  const limit = clampLimit(input);
  const d = await getReportData(range);
  const rows = d.topProducts.slice(0, limit);
  return {
    content: JSON.stringify({
      range: d.range,
      top_products: rows.map((p) => ({
        product: p.product_name,
        quantity_sold: p.quantity_sold,
        revenue: naira(p.revenue),
      })),
    }),
    sources: rows[0]
      ? [{ tool: "get_top_products", label: "Top product", value: `${rows[0].product_name} (${naira(rows[0].revenue)})` }]
      : [],
  };
}

async function topCustomers(input: Json): Promise<ToolResult> {
  const range = asRange(input);
  const limit = clampLimit(input);
  const d = await getReportData(range);
  const rows = d.topCustomers.slice(0, limit);
  return {
    content: JSON.stringify({
      range: d.range,
      top_customers: rows.map((c) => ({
        customer: c.customer_name,
        spend: naira(c.spend),
        invoices: c.invoice_count,
      })),
    }),
    sources: rows[0]
      ? [{ tool: "get_top_customers", label: "Top customer", value: `${rows[0].customer_name} (${naira(rows[0].spend)})` }]
      : [],
  };
}

async function findCustomer(input: Json): Promise<ToolResult> {
  const query = typeof input.query === "string" ? input.query.trim() : "";
  if (!query) return { content: JSON.stringify({ error: "query is required" }), sources: [] };
  const matches = (await listCustomers(query)).slice(0, 5);
  const enriched = await Promise.all(
    matches.map(async (c) => ({
      name: c.full_name,
      phone: c.phone,
      email: c.email,
      total_spend: naira(await getCustomerTotalSpend(c.id)),
    })),
  );
  return {
    content: JSON.stringify({ customers: enriched, count: enriched.length }),
    sources: enriched[0]
      ? [{ tool: "find_customer", label: enriched[0].name, value: enriched[0].total_spend }]
      : [],
  };
}

const EXECUTORS: Record<string, (input: Json) => Promise<ToolResult>> = {
  get_financial_summary: financialSummary,
  get_top_products: topProducts,
  get_top_customers: topCustomers,
  get_unpaid_invoices: unpaidInvoices,
  get_low_stock: lowStock,
  find_customer: findCustomer,
};

export async function executeTool(name: string, input: unknown): Promise<ToolResult> {
  const exec = EXECUTORS[name];
  if (!exec) {
    return { content: JSON.stringify({ error: `Unknown tool: ${name}` }), sources: [] };
  }
  try {
    return await exec((input ?? {}) as Json);
  } catch {
    // Never leak internals to the model; report a clean tool failure.
    return { content: JSON.stringify({ error: "Tool failed to run." }), sources: [] };
  }
}
