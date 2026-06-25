import { requireSession } from "@/modules/auth/session";
import {
  getAiSettings,
  getConversationMessages,
  listConversations,
} from "@/modules/ai/queries";
import { aiConfigured } from "@/modules/ai/orchestrator";
import { AssistantClient } from "./assistant-client";

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: { c?: string };
}) {
  const { profile } = await requireSession();
  const [conversations, settings] = await Promise.all([
    listConversations(),
    getAiSettings(profile.company_id),
  ]);

  const activeId =
    searchParams.c && conversations.some((c) => c.id === searchParams.c)
      ? searchParams.c
      : null;
  const messages = activeId ? await getConversationMessages(activeId) : [];

  return (
    <AssistantClient
      key={activeId ?? "new"}
      configured={aiConfigured()}
      enabled={settings.enabled}
      conversations={conversations.map((c) => ({ id: c.id, title: c.title }))}
      activeId={activeId}
      initialMessages={messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources,
      }))}
    />
  );
}
