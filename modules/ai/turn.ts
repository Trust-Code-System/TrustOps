import "server-only";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/modules/auth/session";
import type { AiSource } from "@/modules/shared/types";
import { getAiSettings, getConversationMessages, getMonthSpendUsdCents } from "./queries";
import { aiConfigured, assistantSystemPrompt, type ChatTurn, type OrchestratorResult } from "./orchestrator";
import { sendMessageSchema } from "./schemas";

/**
 * Shared pre-flight for one assistant turn — used by BOTH the streaming route
 * and the non-streaming server action so the gates never drift: validate →
 * enabled → budget → ensure conversation → persist the user turn → build the
 * grounded system prompt + capped history.
 */
export type PreparedTurn = {
  conversationId: string;
  companyId: string;
  userId: string;
  history: ChatTurn[];
  system: string;
  text: string;
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
}): Promise<PrepareResult> {
  const ctx = await getSessionContext();
  if (!ctx) return { ok: false, error: "Your session has expired. Log in again." };

  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid message" };
  }
  const { text } = parsed.data;
  const companyId = ctx.profile.company_id;
  const userId = ctx.userId;

  if (!aiConfigured()) {
    return { ok: false, error: "The assistant isn't configured yet. Add an API key to enable it." };
  }

  const settings = await getAiSettings(companyId);
  if (!settings.enabled) {
    return { ok: false, error: "The assistant is turned off. An owner can enable it in Settings." };
  }
  if (
    settings.monthly_cap_usd_cents !== null &&
    (await getMonthSpendUsdCents()) >= settings.monthly_cap_usd_cents
  ) {
    return { ok: false, error: "This month's AI spend cap has been reached." };
  }

  const supabase = createClient();

  let conversationId = parsed.data.conversationId ?? null;
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
  const history: ChatTurn[] = prior.slice(-24).map((m) => ({ role: m.role, content: m.content }));
  await supabase.from("ai_messages").insert({
    company_id: companyId,
    user_id: userId,
    conversation_id: conversationId,
    role: "user",
    content: text,
  });

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
      system: assistantSystemPrompt({
        companyName: (company as { name: string } | null)?.name ?? "your business",
        role: ctx.profile.role,
        today: lagosToday(),
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
