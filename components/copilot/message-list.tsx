"use client";

import { Orbit } from "lucide-react";
import { Markdown } from "@/components/ui/markdown";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "./use-assistant-stream";

/**
 * Shared chat rendering for the assistant page and the copilot dock: message
 * bubbles, source chips, and the typing indicator. Keeping these here means both
 * surfaces stay visually identical and only need one place to change.
 */
export function MessageList({
  messages,
  sending,
}: {
  messages: ChatMessage[];
  sending: boolean;
}) {
  return (
    <>
      {messages.map((m, i) => {
        // The empty assistant placeholder renders as the typing indicator below.
        if (m.role === "assistant" && !m.content) return null;
        const isUser = m.role === "user";
        return (
          <div
            key={m.id ?? i}
            className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
          >
            {!isUser && (
              <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-card text-text-secondary">
                <Orbit className="h-[18px] w-[18px]" aria-hidden="true" />
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
        !messages[messages.length - 1]?.content && <TypingIndicator />}
    </>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex justify-start gap-3">
      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-card text-primary-600">
        <Orbit className="h-[18px] w-[18px] animate-pulse" aria-hidden="true" />
      </span>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-border-subtle bg-surface-card px-4 py-3 text-small text-text-muted">
        <Dot /> <Dot delay="150ms" /> <Dot delay="300ms" />
      </div>
    </div>
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

/**
 * The TrustOps AI brand mark. An orbit glyph (a point circling a core) reads as
 * a live, intelligent system and stays distinct from the now-ubiquitous AI
 * sparkle. This is the single source of the AI logo — every AI touchpoint
 * (copilot button, assistant welcome, chat avatar, nav, dashboard, marketing)
 * renders this same icon. Inherits currentColor.
 */
export function AiMark({ className }: { className?: string }) {
  return <Orbit className={className} aria-hidden="true" />;
}
