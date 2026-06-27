"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Send,
  TrendingUp,
  Package,
  Users,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { AiMark, MessageList } from "@/components/copilot/message-list";
import {
  useAssistantStream,
  type ChatMessage,
} from "@/components/copilot/use-assistant-stream";

const SUGGESTIONS: { icon: LucideIcon; title: string; question: string }[] = [
  {
    icon: TrendingUp,
    title: "Today's Performance",
    question: "What is my revenue today compared to yesterday?",
  },
  {
    icon: Package,
    title: "Inventory Check",
    question: "Which products are low on stock right now?",
  },
  {
    icon: Users,
    title: "Top Customers",
    question: "Show me my top 5 customers this month.",
  },
  {
    icon: ReceiptText,
    title: "Unpaid Invoices",
    question: "Who owes me money right now?",
  },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning.";
  if (h < 17) return "Good afternoon.";
  return "Good evening.";
}

export function AssistantClient({
  configured,
  enabled,
  conversations,
  activeId,
  initialMessages,
}: {
  configured: boolean;
  enabled: boolean;
  conversations: { id: string; title: string }[];
  activeId: string | null;
  initialMessages: ChatMessage[];
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const blocked = !configured || !enabled;
  const { messages, sending, error, send } = useAssistantStream({
    initialMessages,
    conversationId: activeId,
    blocked,
    onDone: (conversationId, wasNew) => {
      if (wasNew && conversationId) router.replace(`/assistant?c=${conversationId}`);
      else router.refresh();
    },
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending || blocked) return;
    setInput("");
    send(trimmed);
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex gap-6">
      {/* Conversation history (desktop) */}
      <aside className="hidden w-56 shrink-0 lg:block">
        <Link
          href="/assistant"
          className="mb-3 flex items-center gap-2 rounded-md border border-border-subtle bg-surface-card px-3 py-2 text-body-strong text-text-primary hover:bg-gray-50"
        >
          <Plus className="h-[18px] w-[18px]" /> New chat
        </Link>
        <nav className="space-y-1">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/assistant?c=${c.id}`}
              className={cn(
                "block truncate rounded-md px-3 py-2 text-small",
                c.id === activeId
                  ? "bg-primary-50 text-primary-700"
                  : "text-text-secondary hover:bg-gray-100",
              )}
            >
              {c.title}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Chat */}
      <div className="mx-auto flex min-h-[calc(100vh-7rem)] min-w-0 max-w-3xl flex-1 flex-col">
        {!configured && (
          <Alert className="mb-4">
            The assistant isn&apos;t configured yet. Add an API key to enable it.
          </Alert>
        )}
        {configured && !enabled && (
          <Alert className="mb-4">
            The assistant is turned off. An owner can enable it in Settings.
          </Alert>
        )}

        <div className="flex-1 space-y-4 overflow-y-auto pb-4">
          {isEmpty && (
            <div className="pt-6">
              {/* Centered welcome */}
              <div className="flex flex-col items-center text-center">
                <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-text-on-primary shadow-sm ring-4 ring-primary-100">
                  <AiMark className="h-9 w-9" />
                </span>
                <h1 className="text-h1 text-text-primary">{greeting()}</h1>
                <p className="mt-2 max-w-md text-body text-text-secondary">
                  I&apos;m your TrustOps AI assistant. I can analyze your sales,
                  check inventory, or surface money owed. How can I help today?
                </p>
              </div>

              {/* Suggestion grid */}
              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.title}
                      type="button"
                      disabled={blocked}
                      onClick={() => submit(s.question)}
                      className="group flex items-start gap-3 rounded-lg border border-border-subtle bg-surface-card p-4 text-left transition-all hover:border-primary-300 hover:shadow-sm disabled:opacity-40"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100 text-text-muted transition-colors group-hover:bg-primary-50 group-hover:text-primary-600">
                        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block text-body-strong text-text-primary">
                          {s.title}
                        </span>
                        <span className="mt-0.5 block text-small text-text-muted">
                          &ldquo;{s.question}&rdquo;
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <MessageList messages={messages} sending={sending} />
          <div ref={endRef} />
        </div>

        {error && <Alert className="mb-3">{error}</Alert>}

        {/* Composer */}
        <div className="border-t border-border-subtle pt-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
            className="flex items-center gap-2 rounded-full border border-border-default bg-surface-card py-1.5 pl-5 pr-1.5 focus-within:border-border-focus focus-within:ring-[3px] focus-within:ring-primary-100"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={blocked || sending}
              placeholder={
                blocked ? "Assistant unavailable" : "Ask Claude to analyze your business data…"
              }
              className="h-9 flex-1 bg-transparent text-body text-text-primary placeholder:text-gray-500 focus:outline-none disabled:cursor-not-allowed"
              aria-label="Message the assistant"
            />
            <button
              type="submit"
              disabled={blocked || !input.trim() || sending}
              aria-label="Send message"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600 text-text-on-primary transition-colors hover:bg-primary-700 disabled:opacity-40"
            >
              <Send className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
