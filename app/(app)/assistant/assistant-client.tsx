"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bot,
  Plus,
  Send,
  Sparkles,
  TrendingUp,
  Package,
  Users,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Markdown } from "@/components/ui/markdown";
import { cn } from "@/lib/utils";
import type { AiSource } from "@/modules/shared/types";

type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; conversationId: string; sources: AiSource[]; text: string }
  | { type: "error"; error: string; conversationId?: string };

type ChatMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  sources?: AiSource[];
};

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
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const blocked = !configured || !enabled;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  function appendDelta(delta: string) {
    setMessages((m) => {
      const copy = m.slice();
      const last = copy[copy.length - 1];
      if (last?.role === "assistant") {
        copy[copy.length - 1] = { ...last, content: last.content + delta };
      }
      return copy;
    });
  }
  function finalizeAssistant(text: string, sources: AiSource[]) {
    setMessages((m) => {
      const copy = m.slice();
      const last = copy[copy.length - 1];
      if (last?.role === "assistant") {
        copy[copy.length - 1] = { ...last, content: last.content || text, sources };
      }
      return copy;
    });
  }
  function dropEmptyAssistant() {
    setMessages((m) => {
      const last = m[m.length - 1];
      return last?.role === "assistant" && !last.content ? m.slice(0, -1) : m;
    });
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending || blocked) return;
    setError(null);
    setInput("");
    // Optimistic user turn + an empty assistant bubble we fill as tokens arrive.
    setMessages((m) => [
      ...m,
      { role: "user", content: trimmed },
      { role: "assistant", content: "", sources: [] },
    ]);
    setSending(true);

    let done: Extract<StreamEvent, { type: "done" }> | null = null;
    try {
      const res = await fetch("/api/assistant/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeId, text: trimmed }),
      });
      if (!res.ok || !res.body) throw new Error("stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let streamError: string | null = null;
      for (;;) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buf += decoder.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const frame = buf.slice(0, i);
          buf = buf.slice(i + 2);
          const line = frame.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          let evt: StreamEvent;
          try {
            evt = JSON.parse(line.slice(6)) as StreamEvent;
          } catch {
            continue;
          }
          if (evt.type === "delta") appendDelta(evt.text);
          else if (evt.type === "done") done = evt;
          else if (evt.type === "error") streamError = evt.error;
        }
      }
      if (streamError) {
        dropEmptyAssistant();
        setError(streamError);
      } else if (done) {
        finalizeAssistant(done.text, done.sources ?? []);
      }
    } catch {
      dropEmptyAssistant();
      setError("The assistant couldn't respond just now. Please try again.");
    } finally {
      setSending(false);
    }

    if (done) {
      if (!activeId) router.replace(`/assistant?c=${done.conversationId}`);
      else router.refresh();
    }
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
                  <AiSparkle className="h-9 w-9" />
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
                      onClick={() => send(s.question)}
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

          {messages.map((m, i) => {
            // The empty assistant placeholder shows as the "Thinking…" indicator
            // below until its first token arrives.
            if (m.role === "assistant" && !m.content) return null;
            const isUser = m.role === "user";
            return (
              <div
                key={m.id ?? i}
                className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
              >
                {!isUser && (
                  <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-card text-text-secondary">
                    <Bot className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                )}
                <div
                  className={cn(
                    "max-w-[85%] px-4 py-3 text-body",
                    isUser
                      ? "rounded-2xl rounded-tr-sm bg-primary-600 text-text-on-primary"
                      : "rounded-2xl rounded-tl-sm border border-border-subtle bg-surface-card text-text-primary",
                  )}
                >
                  {isUser ? (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                ) : (
                  <Markdown>{m.content}</Markdown>
                )}
                  {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-border-subtle pt-2">
                      {m.sources.map((s, j) => (
                        <span
                          key={j}
                          className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-caption text-text-secondary"
                        >
                          <span className="text-text-muted">{s.label}:</span>
                          <span className="tabular font-[600]">{s.value}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {sending &&
            messages[messages.length - 1]?.role === "assistant" &&
            !messages[messages.length - 1]?.content && (
              <div className="flex justify-start gap-3">
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-card text-primary-600">
                  <Sparkles className="h-[18px] w-[18px] animate-pulse" aria-hidden="true" />
                </span>
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-border-subtle bg-surface-card px-4 py-3 text-small text-text-muted">
                  <Dot /> <Dot delay="150ms" /> <Dot delay="300ms" />
                </div>
              </div>
            )}
          <div ref={endRef} />
        </div>

        {error && <Alert className="mb-3">{error}</Alert>}

        {/* Composer */}
        <div className="border-t border-border-subtle pt-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
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

/**
 * Generative-AI sparkle glyph — a large four-point star flanked by two smaller
 * ones. Reads as "intelligent assistant" far better than a literal robot, and
 * echoes the Sparkles used in the thinking indicator. Inherits currentColor.
 */
function AiSparkle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      role="img"
      aria-hidden="true"
      className={className}
    >
      <path d="M11.5 3 9.4 8.4 4 10.5l5.4 2.1L11.5 18l2.1-5.4L19 10.5l-5.4-2.1L11.5 3Z" />
      <path d="M18.5 2.5 17.6 4.9 15.2 5.8l2.4.9.9 2.4.9-2.4 2.4-.9-2.4-.9-.9-2.4Z" />
      <path d="M18 14.5 17.3 16.3 15.5 17l1.8.7.7 1.8.7-1.8 1.8-.7-1.8-.7-.7-1.8Z" />
    </svg>
  );
}

/** Animated typing dot. */
function Dot({ delay = "0ms" }: { delay?: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted"
      style={{ animationDelay: delay }}
    />
  );
}
