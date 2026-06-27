"use client";

import { Bot, Sparkles } from "lucide-react";
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
        !messages[messages.length - 1]?.content && <TypingIndicator />}
    </>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex justify-start gap-3">
      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-card text-primary-600">
        <Sparkles className="h-[18px] w-[18px] animate-pulse" aria-hidden="true" />
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
 * Generative-AI sparkle glyph — a large four-point star flanked by two smaller
 * ones. Reads as "intelligent assistant" far better than a literal robot.
 * Inherits currentColor.
 */
export function AiSparkle({ className }: { className?: string }) {
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
