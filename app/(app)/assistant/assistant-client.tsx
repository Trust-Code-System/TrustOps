"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Plus, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
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

const SUGGESTIONS = [
  "How much did I make this month?",
  "Who owes me money?",
  "What's low on stock?",
  "Who are my top customers?",
];

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
      <div className="flex min-h-[calc(100vh-12rem)] min-w-0 flex-1 flex-col">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-display">
              <Sparkles className="h-6 w-6 text-primary-600" /> Assistant
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              Ask about your sales, customers, stock, and money owed.
            </p>
          </div>
          <Link
            href="/assistant"
            className="lg:hidden inline-flex items-center gap-1 text-small font-[600] text-primary-600"
          >
            <Plus className="h-4 w-4" /> New
          </Link>
        </div>

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
          {messages.length === 0 && (
            <div className="rounded-lg border border-border-subtle bg-surface-card p-6">
              <p className="text-body-strong text-text-primary">
                Every answer is grounded in your own data.
              </p>
              <p className="mt-1 text-small text-text-muted">
                Figures come from your records — the assistant never guesses. Try:
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={blocked}
                    onClick={() => send(s)}
                    className="rounded-full border border-border-default px-3 py-1.5 text-small text-text-secondary hover:bg-gray-50 disabled:opacity-40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => {
            // The empty assistant placeholder is represented by the "Thinking…"
            // indicator below until its first token arrives.
            if (m.role === "assistant" && !m.content) return null;
            return (
            <div
              key={m.id ?? i}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-4 py-3 text-body",
                  m.role === "user"
                    ? "bg-primary-600 text-text-on-primary"
                    : "border border-border-subtle bg-surface-card text-text-primary",
                )}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
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
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-card px-4 py-3 text-small text-text-muted">
                  <MessageSquare className="h-4 w-4 animate-pulse" /> Thinking…
                </div>
              </div>
            )}
          <div ref={endRef} />
        </div>

        {error && <Alert className="mb-3">{error}</Alert>}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2 border-t border-border-subtle pt-4"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={blocked || sending}
            placeholder={blocked ? "Assistant unavailable" : "Ask about your business…"}
            className="h-11 flex-1 rounded-sm border border-border-default bg-surface-card px-3 text-body text-text-primary placeholder:text-gray-500 focus:border-border-focus focus:outline-none focus:ring-[3px] focus:ring-primary-100 disabled:bg-gray-100"
            aria-label="Message the assistant"
          />
          <Button type="submit" size="lg" isLoading={sending} disabled={blocked || !input.trim()}>
            <Send className="h-[18px] w-[18px]" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
