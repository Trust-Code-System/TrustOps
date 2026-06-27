"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/modules/auth/session";
import type { AiAction } from "@/modules/shared/types";
import { recordPayment } from "@/modules/invoices/actions";
import { sendReceipt, sendInvoiceReminder } from "@/modules/notifications/actions";
import { createPaymentLink } from "@/modules/payments/actions";

type Result = { ok: true; message: string; url?: string } | { ok: false; error: string };

/** Pending copilot proposals for the signed-in user (RLS scopes to them). */
export async function listPendingActions(): Promise<AiAction[]> {
  const ctx = await getSessionContext();
  if (!ctx) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("ai_actions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  return (data as AiAction[] | null) ?? [];
}

/**
 * Approve + execute a proposed action. Runs the SAME RLS-scoped, role-gated
 * server action a human would use, then records the outcome. The user's
 * explicit approval here IS the yes/no decision the assistant never makes.
 */
export async function approveAiAction(id: string): Promise<Result> {
  const ctx = await getSessionContext();
  if (!ctx) return { ok: false, error: "Your session has expired. Log in again." };

  const supabase = createClient();
  // RLS guarantees this is the caller's own pending proposal.
  const { data } = await supabase
    .from("ai_actions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const action = data as AiAction | null;
  if (!action) return { ok: false, error: "Action not found" };
  if (action.status !== "pending") return { ok: false, error: "This action was already handled" };

  const p = action.params as { invoice_id?: string; amount_kobo?: number; method?: string };
  const invoiceId = String(p.invoice_id ?? "");
  if (!invoiceId) return { ok: false, error: "Action is missing its invoice" };

  let outcome: Result;
  switch (action.type) {
    case "send_reminder": {
      const r = await sendInvoiceReminder(invoiceId);
      outcome = r.ok ? { ok: true, message: "Reminder sent." } : { ok: false, error: r.error ?? "Failed" };
      break;
    }
    case "send_receipt": {
      const r = await sendReceipt(invoiceId);
      outcome = r.ok ? { ok: true, message: "Receipt sent." } : { ok: false, error: r.error ?? "Failed" };
      break;
    }
    case "record_payment": {
      const r = await recordPayment({
        invoiceId,
        amountKobo: Number(p.amount_kobo ?? 0),
        method: (p.method as "cash" | "transfer" | "card" | "other") ?? "cash",
        reference: null,
      });
      outcome = r.ok ? { ok: true, message: "Payment recorded." } : { ok: false, error: r.error };
      break;
    }
    case "create_payment_link": {
      const r = await createPaymentLink(invoiceId);
      outcome = r.ok
        ? { ok: true, message: "Payment link created.", url: r.url }
        : { ok: false, error: r.error };
      break;
    }
    default:
      outcome = { ok: false, error: "Unsupported action" };
  }

  await supabase.rpc("set_ai_action_status", {
    p_id: id,
    p_status: outcome.ok ? "executed" : "failed",
    p_result: outcome.ok ? { message: outcome.message, url: outcome.url ?? null } : { error: outcome.error },
  });

  revalidatePath("/assistant");
  revalidatePath("/invoices");
  return outcome;
}

/** Reject a proposed action without running it. */
export async function rejectAiAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getSessionContext();
  if (!ctx) return { ok: false, error: "Your session has expired. Log in again." };
  const supabase = createClient();
  const { error } = await supabase.rpc("set_ai_action_status", {
    p_id: id,
    p_status: "rejected",
    p_result: null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/assistant");
  return { ok: true };
}
