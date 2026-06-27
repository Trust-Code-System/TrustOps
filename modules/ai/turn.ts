import "server-only";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/modules/auth/session";
import type { AiSource } from "@/modules/shared/types";
import { getAiSettings, getConversationMessages, getMonthSpendUsdCents } from "./queries";
import { aiConfigured, assistantSystemPrompt, type ChatTurn, type OrchestratorResult } from "./orchestrator";
import { buildPageSnapshot, resolvePageContext } from "./page-context";
import { sendMessageSchema } from "./schemas";

/** A synthetic instruction stands in for the user turn when proactively briefing. */
const BRIEF_TRIGGER = "Brief me on this page.";

/**
 * Shared pre-flight for one assistant turn — used by BOTH the streaming route
 * and the non-streaming server action so the gates never drift: validate →
 * enabled → budget → ensure conversation → persist the user turn → build the
 * grounded system prompt + capped history.
 */
export type PreparedTurn = {
  /** Null for a proactive brief — briefs are not persisted to a conversation. */
  conversationId: string | null;
  companyId: string;
  userId: string;
  history: ChatTurn[];
  system: string;
  text: string;
  mode: "chat" | "brief";
  /** Claude spend cap hit — skip Claude, let the backup providers answer. */
  capReached: boolean;
};

export type PrepareResult =
  | { ok: true; turn: PreparedTurn }
  | { ok: false; error: string; conversationId?: string };

function lagosToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());
}

export async function prepareTurn(input: {
  conversationId?: string | null;
  text: string;
  /** In-app pathname (a pointer only) used to build RLS-scoped page context. */
  pathname?: string | null;
  /** "brief" = proactive opening summary (synthetic prompt, not persisted). */
  mode?: "chat" | "brief";
}): Promise<PrepareResult> {
  const ctx = await getSessionContext();
  if (!ctx) return { ok: false, error: "Your session has expired. Log in again." };

  const mode = input.mode === "brief" ? "brief" : "chat";
  let text: string;
  if (mode === "brief") {
    text = BRIEF_TRIGGER; // synthetic — the user did not type this.
  } else {
    const parsed = sendMessageSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid message" };
    }
    text = parsed.data.text;
  }
  const companyId = ctx.profile.company_id;
  const userId = ctx.userId;

  if (!aiConfigured()) {
    return { ok: false, error: "The assistant isn't configured yet. Add an API key to enable it." };
  }

  const settings = await getAiSettings(companyId);
  if (!settings.enabled) {
    return { ok: false, error: "The assistant is turned off. An owner can enable it in Settings." };
  }
  // Claude spend cap: do NOT block. Mark it reached so the run skips Claude and
  // a backup provider (Groq/Gemini) answers instead — the user never sees a cap
  // error. If no backup is configured, the run degrades to a calm message.
  const capReached =
    settings.monthly_cap_usd_cents !== null &&
    (await getMonthSpendUsdCents()) >= settings.monthly_cap_usd_cents;

  const supabase = createClient();

  // Page context is derived server-side from the pathname (a pointer) and
  // fetched through RLS-scoped queries, so it can never widen the caller's scope.
  const page = input.pathname
    ? await buildPageSnapshot(resolvePageContext(input.pathname))
    : null;

  // A brief is a synthetic, one-shot turn: no conversation, no history, and
  // nothing written to ai_messages. Its cost is logged separately via
  // logBriefUsage so the monthly cap stays accurate.
  let conversationId: string | null = null;
  let history: ChatTurn[] = [];

  if (mode === "chat") {
    conversationId = input.conversationId ?? null;
    if (!conversationId) {
      const { data, error } = await supabase
        .from("ai_conversations")
        .insert({ company_id: companyId, user_id: userId, title: text.slice(0, 60) })
        .select("id")
        .single();
      if (error || !data) return { ok: false, error: "Could not start a conversation." };
      conversationId = (data as { id: string }).id;
    }

    // History BEFORE this turn (cap the context window), then persist the user
    // turn so it survives a model failure.
    const prior = await getConversationMessages(conversationId);
    history = prior.slice(-24).map((m) => ({ role: m.role, content: m.content }));
    await supabase.from("ai_messages").insert({
      company_id: companyId,
      user_id: userId,
      conversation_id: conversationId,
      role: "user",
      content: text,
    });
  }

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .single();

  return {
    ok: true,
    turn: {
      conversationId,
      companyId,
      userId,
      history,
      text,
      mode,
      capReached,
      system: assistantSystemPrompt({
        companyName: (company as { name: string } | null)?.name ?? "your business",
        role: ctx.profile.role,
        today: lagosToday(),
        page: page ? { label: page.label, summary: page.summary } : null,
        mode,
      }),
    },
  };
}

/** Persist the assistant answer + token spend, and bump the conversation. */
export async function persistAssistantTurn(opts: {
  conversationId: string;
  companyId: string;
  userId: string;
  result: OrchestratorResult;
  sources: AiSource[];
}): Promise<void> {
  const supabase = createClient();
  await supabase.from("ai_messages").insert({
    company_id: opts.companyId,
    user_id: opts.userId,
    conversation_id: opts.conversationId,
    role: "assistant",
    content: opts.result.text,
    sources: opts.sources,
  });
  await supabase.from("ai_usage").insert({
    company_id: opts.companyId,
    user_id: opts.userId,
    conversation_id: opts.conversationId,
    model: opts.result.model,
    input_tokens: opts.result.inputTokens,
    output_tokens: opts.result.outputTokens,
    cost_usd_cents: opts.result.costUsdCents,
  });
  await supabase
    .from("ai_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", opts.conversationId);
  revalidatePath("/assistant");
}

/**
 * Log the token spend of a proactive brief. Briefs are not persisted as chat
 * messages (they belong to no conversation), but their cost must still count
 * toward the monthly cap — so we write an ai_usage row with a null conversation.
 */
export async function logBriefUsage(opts: {
  companyId: string;
  userId: string;
  result: OrchestratorResult;
}): Promise<void> {
  const supabase = createClient();
  await supabase.from("ai_usage").insert({
    company_id: opts.companyId,
    user_id: opts.userId,
    conversation_id: null,
    model: opts.result.model,
    input_tokens: opts.result.inputTokens,
    output_tokens: opts.result.outputTokens,
    cost_usd_cents: opts.result.costUsdCents,
  });
}
