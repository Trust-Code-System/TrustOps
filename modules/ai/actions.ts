"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/modules/auth/session";
import type { ActionState } from "@/modules/auth/schemas";
import type { AiSource } from "@/modules/shared/types";
import { runAssistant } from "./orchestrator";
import { persistAssistantTurn, prepareTurn } from "./turn";
import { aiSettingsSchema } from "./schemas";

export type SendResult =
  | { ok: true; conversationId: string; message: { text: string; sources: AiSource[] } }
  | { ok: false; error: string; conversationId?: string };

/** Owner-only: enable/disable the assistant + set the monthly USD spend cap. */
export async function saveAiSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Your session has expired. Log in again." };
  if (ctx.profile.role !== "owner") {
    return { error: "Only the owner can change AI settings" };
  }

  const rawCap = (formData.get("capUsd") as string | null)?.trim();
  const parsed = aiSettingsSchema.safeParse({
    enabled: formData.get("enabled") === "on",
    capUsd: rawCap ? Number(rawCap) : null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid AI settings" };
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("save_ai_settings", {
    p_enabled: parsed.data.enabled,
    p_cap_usd_cents: parsed.data.capUsd === null ? null : parsed.data.capUsd * 100,
  });
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Non-streaming send (programmatic API / fallback). The chat UI uses the
 * streaming route /api/assistant/stream; both share prepareTurn + persist.
 */
export async function sendAssistantMessage(input: {
  conversationId?: string | null;
  text: string;
}): Promise<SendResult> {
  const prep = await prepareTurn(input);
  if (!prep.ok) return { ok: false, error: prep.error, conversationId: prep.conversationId };
  const t = prep.turn;
  if (t.conversationId === null) {
    // The non-streaming path is always a normal chat turn, so this is
    // unreachable; the guard keeps the persisted-conversation contract type-safe.
    return { ok: false, error: "Could not start a conversation." };
  }

  let result;
  try {
    result = await runAssistant({
      system: t.system,
      history: t.history,
      userMessage: t.text,
      skipPrimary: t.capReached,
    });
  } catch {
    return {
      ok: false,
      conversationId: t.conversationId,
      error: "The assistant couldn't respond just now. Please try again.",
    };
  }

  await persistAssistantTurn({
    conversationId: t.conversationId,
    companyId: t.companyId,
    userId: t.userId,
    result,
    sources: result.sources,
  });
  return { ok: true, conversationId: t.conversationId, message: { text: result.text, sources: result.sources } };
}
