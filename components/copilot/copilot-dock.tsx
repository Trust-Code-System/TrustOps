"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Send, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { AiSparkle, MessageList } from "./message-list";
import { useAssistantStream } from "./use-assistant-stream";

/**
 * Global copilot dock — a floating button on every authenticated page that opens
 * a page-aware assistant panel. On open it proactively briefs the user about the
 * page they are on (what is done, what is outstanding, what to do next), then
 * answers follow-up questions with that same page context. The page is sent only
 * as a pathname pointer; the server re-derives and re-fetches under RLS, so the
 * copilot is strictly scoped to this company and never leaks data outside it.
 */

const QUICK_PROMPTS: Record<string, string[]> = {
  customers: ["Draft a friendly payment reminder for this customer", "What does this customer still owe?"],
  invoices: ["Is this invoice fully paid?", "Draft a reminder for the balance"],
  products: ["Is this product low on stock?", "How is this product selling?"],
  dashboard: ["What needs my attention today?", "Who owes me money right now?"],
  analytics: ["Summarise this period's performance", "What is driving my profit?"],
  reports: ["Summarise this report", "How does this compare to last month?"],
  default: ["What needs my attention here?", "Summarise this page for me"],
};

function promptsFor(pathname: string): string[] {
  const seg = pathname.replace(/^\/+/, "").split("/")[0] ?? "";
  return QUICK_PROMPTS[seg] ?? QUICK_PROMPTS.default!;
}

export function CopilotDock({
  configured,
  enabled,
}: {
  configured: boolean;
  enabled: boolean;
}) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const briefedPaths = useRef<Set<string>>(new Set());

  const blocked = !configured || !enabled;
  const { messages, sending, error, send, brief } = useAssistantStream({ blocked });

  // Brief the current page the first time the dock is opened on it.
  useEffect(() => {
    if (!open || blocked) return;
    if (briefedPaths.current.has(pathname)) return;
    briefedPaths.current.add(pathname);
    brief(pathname);
  }, [open, blocked, pathname, brief]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending, open]);

  // The assistant page is already a full-screen copilot; no floating dock there.
  if (blocked || pathname.startsWith("/assistant")) return null;

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setInput("");
    send(trimmed, pathname);
  }

  return (
    <>
      {/* Floating launcher — clears the mobile bottom tab bar. */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open AI copilot"
          className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-text-on-primary shadow-lg ring-4 ring-primary-100 transition-colors hover:bg-primary-700 md:bottom-6 md:right-6"
        >
          <AiSparkle className="h-7 w-7" />
        </button>
      )}

      {/* Slide-over panel */}
      {open && (
        <div className="fixed inset-0 z-50 md:inset-auto md:bottom-6 md:right-6">
          {/* Mobile scrim */}
          <div
            className="absolute inset-0 bg-black/30 md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute bottom-0 right-0 flex h-[85vh] w-full flex-col rounded-t-2xl border border-border-subtle bg-surface-page shadow-xl md:relative md:h-[34rem] md:w-[24rem] md:rounded-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-text-on-primary">
                  <AiSparkle className="h-[18px] w-[18px]" />
                </span>
                <span className="text-body-strong text-text-primary">AI Copilot</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close copilot"
                className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:bg-gray-100"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>

            {/* Thread */}
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {messages.length === 0 && !sending && (
                <p className="pt-6 text-center text-small text-text-muted">
                  Reading this page…
                </p>
              )}
              <MessageList messages={messages} sending={sending} />
              <div ref={endRef} />
            </div>

            {error && <Alert className="mx-4 mb-2">{error}</Alert>}

            {/* Quick prompts */}
            {!sending && (
              <div className="flex flex-wrap gap-2 px-4 pb-2">
                {promptsFor(pathname).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => submit(p)}
                    className="rounded-full border border-border-subtle bg-surface-card px-3 py-1 text-caption text-text-secondary transition-colors hover:border-primary-300 hover:text-primary-700"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Composer */}
            <div className="border-t border-border-subtle p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit(input);
                }}
                className="flex items-center gap-2 rounded-full border border-border-default bg-surface-card py-1.5 pl-4 pr-1.5 focus-within:border-border-focus focus-within:ring-[3px] focus-within:ring-primary-100"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={sending}
                  placeholder="Ask about this page…"
                  className="h-8 flex-1 bg-transparent text-body text-text-primary placeholder:text-gray-500 focus:outline-none disabled:cursor-not-allowed"
                  aria-label="Message the copilot"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  aria-label="Send message"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-text-on-primary transition-colors hover:bg-primary-700 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
