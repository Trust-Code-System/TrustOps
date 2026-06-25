import { type NextRequest } from "next/server";
import { runAssistantStream } from "@/modules/ai/orchestrator";
import { persistAssistantTurn, prepareTurn } from "@/modules/ai/turn";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/assistant/stream  { conversationId?, text }
 * Server-Sent Events. Runs the grounded, RLS-scoped tool loop and streams the
 * answer token-by-token. Shares prepareTurn + persistAssistantTurn with the
 * non-streaming action, so the enabled/budget/persistence gates never drift.
 * Events: {type:"delta",text} · {type:"done",conversationId,sources,text} · {type:"error",error}
 */
export async function POST(request: NextRequest) {
  let body: { conversationId?: string | null; text?: string };
  try {
    body = await request.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      const prep = await prepareTurn({
        conversationId: body.conversationId ?? null,
        text: body.text ?? "",
      });
      if (!prep.ok) {
        send({ type: "error", error: prep.error, conversationId: prep.conversationId });
        controller.close();
        return;
      }
      const t = prep.turn;

      try {
        const result = await runAssistantStream({
          system: t.system,
          history: t.history,
          userMessage: t.text,
          onText: (delta) => send({ type: "delta", text: delta }),
        });
        await persistAssistantTurn({
          conversationId: t.conversationId,
          companyId: t.companyId,
          userId: t.userId,
          result,
          sources: result.sources,
        });
        send({
          type: "done",
          conversationId: t.conversationId,
          sources: result.sources,
          text: result.text,
        });
      } catch {
        send({
          type: "error",
          error: "The assistant couldn't respond just now. Please try again.",
          conversationId: t.conversationId,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
    },
  });
}
