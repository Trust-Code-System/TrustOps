import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  AiConversation,
  AiInsight,
  AiMessage,
  AiSettings,
} from "@/modules/shared/types";

export function defaultAiSettings(companyId: string): AiSettings {
  return {
    company_id: companyId,
    enabled: true,
    monthly_cap_usd_cents: null,
    updated_at: new Date().toISOString(),
  };
}

export async function getAiSettings(companyId: string): Promise<AiSettings> {
  const supabase = createClient();
  const { data } = await supabase
    .from("ai_settings")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();
  return (data as AiSettings | null) ?? defaultAiSettings(companyId);
}

/** USD-cents spent this calendar month by the caller's company. */
export async function getMonthSpendUsdCents(): Promise<number> {
  const supabase = createClient();
  const { data } = await supabase.rpc("ai_month_usd_cents");
  return Number(data ?? 0);
}

export async function listConversations(): Promise<AiConversation[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("ai_conversations")
    .select("*")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(50);
  return (data as AiConversation[] | null) ?? [];
}

export async function getConversationMessages(conversationId: string): Promise<AiMessage[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("ai_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return (data as AiMessage[] | null) ?? [];
}

/** Latest proactive insight per kind (deduped), newest first. */
export async function listInsights(): Promise<AiInsight[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("ai_insights")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  const seen = new Set<string>();
  const out: AiInsight[] = [];
  for (const row of (data as AiInsight[] | null) ?? []) {
    if (seen.has(row.kind)) continue;
    seen.add(row.kind);
    out.push(row);
  }
  return out.slice(0, 6);
}
