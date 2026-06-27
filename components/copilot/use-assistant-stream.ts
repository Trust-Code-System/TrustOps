"use client";

import { useCallback, useRef, useState } from "react";
import type { AiSource } from "@/modules/shared/types";

/**
 * Shared assistant streaming hook used by both the full /assistant page and the
 * global copilot dock, so the SSE wire protocol and optimistic-message handling
 * live in exactly one place. Talks to POST /api/assistant/stream and supports
 * both a normal chat turn and a proactive, page-aware "brief".
 */

export type ChatMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  sources?: AiSource[];
};

type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; conversationId: string | null; sources: AiSource[]; text: string }
  | { type: "error"; error: string; conversationId?: string | null };

export function useAssistantStream(opts: {
  initialMessages?: ChatMessage[];
  conversationId?: string | null;
  blocked?: boolean;
  /** Fires after a completed turn with the (possibly new) conversation id. */
  onDone?: (conversationId: string | null, wasNew: boolean) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(opts.initialMessages ?? []);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const convoRef = useRef<string | null>(opts.conversationId ?? null);

  const appendDelta = useCallback((delta: string) => {
    setMessages((m) => {
      const copy = m.slice();
      const last = copy[copy.length - 1];
      if (last?.role === "assistant") {
        copy[copy.length - 1] = { ...last, content: last.content + delta };
      }
      return copy;
    });
  }, []);

  const finalizeAssistant = useCallback((text: string, sources: AiSource[]) => {
    setMessages((m) => {
      const copy = m.slice();
      const last = copy[copy.length - 1];
      if (last?.role === "assistant") {
        copy[copy.length - 1] = { ...last, content: last.content || text, sources };
      }
      return copy;
    });
  }, []);

  const dropEmptyAssistant = useCallback(() => {
    setMessages((m) => {
      const last = m[m.length - 1];
      return last?.role === "assistant" && !last.content ? m.slice(0, -1) : m;
    });
  }, []);

  /** Core turn: streams an assistant answer, optionally preceded by a user bubble. */
  const run = useCallback(
    async (
      body: { text?: string; pathname?: string; mode?: "chat" | "brief" },
      displayUserText: string | null,
    ) => {
      if (sending || opts.blocked) return;
      setError(null);
      setMessages((m) => [
        ...m,
        ...(displayUserText ? [{ role: "user" as const, content: displayUserText }] : []),
        { role: "assistant" as const, content: "", sources: [] },
      ]);
      setSending(true);

      const startedWithConvo = convoRef.current;
      let done: Extract<StreamEvent, { type: "done" }> | null = null;
      try {
        const res = await fetch("/api/assistant/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: convoRef.current, ...body }),
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
          if (done.conversationId) convoRef.current = done.conversationId;
        }
      } catch {
        dropEmptyAssistant();
        setError("The assistant couldn't respond just now. Please try again.");
      } finally {
        setSending(false);
      }

      if (done) opts.onDone?.(done.conversationId, !startedWithConvo);
    },
    [appendDelta, dropEmptyAssistant, finalizeAssistant, opts, sending],
  );

  const send = useCallback(
    (text: string, pathname?: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      void run({ text: trimmed, pathname, mode: "chat" }, trimmed);
    },
    [run],
  );

  /** Proactive opening summary for a page; no visible user bubble. */
  const brief = useCallback(
    (pathname: string) => {
      void run({ pathname, mode: "brief" }, null);
    },
    [run],
  );

  return { messages, sending, error, setError, send, brief, conversationId: convoRef };
}
