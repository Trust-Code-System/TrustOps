import "server-only";

import { aiToolDefs, executeTool } from "./tools";
import type { AiSource } from "@/modules/shared/types";
import type { OrchestratorResult, ProviderConfig, RunOpts } from "./providers";

/**
 * OpenAI-compatible adapter — drives Groq and Gemini (both expose the OpenAI
 * chat-completions API) through the SAME grounded, RLS-scoped tool loop the
 * Anthropic path uses. Reuses executeTool, so tools never widen scope. Throws on
 * any HTTP/parse error so the caller can fall over to the next provider.
 */

const MAX_STEPS = 6;
const MAX_TOKENS = 1024;

// aiToolDefs are Anthropic-shaped; convert to OpenAI function tools.
const OPENAI_TOOLS = aiToolDefs.map((t) => ({
  type: "function" as const,
  function: { name: t.name, description: t.description, parameters: t.input_schema },
}));

type OpenAIMessage =
  | { role: "system" | "user" | "assistant"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

async function chatCompletion(cfg: ProviderConfig, messages: unknown[]): Promise<{
  message: { content: string | null; tool_calls?: ToolCall[] };
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}> {
  const res = await fetch(`${cfg.baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      tools: OPENAI_TOOLS,
      tool_choice: "auto",
      max_tokens: MAX_TOKENS,
    }),
  });
  if (!res.ok) throw new Error(`${cfg.name} ${res.status}`);
  const data = (await res.json()) as {
    choices?: { message: { content: string | null; tool_calls?: ToolCall[] } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const message = data.choices?.[0]?.message;
  if (!message) throw new Error(`${cfg.name} empty response`);
  return { message, usage: data.usage };
}

/** Run the agentic loop on an OpenAI-compatible provider (Groq/Gemini). */
export async function runOpenAICompat(
  cfg: ProviderConfig,
  opts: RunOpts,
): Promise<OrchestratorResult> {
  const messages: OpenAIMessage[] = [
    { role: "system", content: opts.system },
    ...opts.history.map((t) => ({ role: t.role, content: t.content })),
    { role: "user", content: opts.userMessage },
  ];

  const sources: AiSource[] = [];
  let inputTokens = 0;
  let outputTokens = 0;

  for (let step = 0; step < MAX_STEPS; step++) {
    const { message, usage } = await chatCompletion(cfg, messages);
    inputTokens += usage?.prompt_tokens ?? 0;
    outputTokens += usage?.completion_tokens ?? 0;

    if (message.tool_calls && message.tool_calls.length > 0) {
      messages.push({ role: "assistant", content: message.content ?? "", tool_calls: message.tool_calls });
      for (const tc of message.tool_calls) {
        let input: unknown = {};
        try {
          input = JSON.parse(tc.function.arguments || "{}");
        } catch {
          input = {};
        }
        const result = await executeTool(tc.function.name, input);
        sources.push(...result.sources);
        messages.push({ role: "tool", tool_call_id: tc.id, content: result.content });
      }
      continue;
    }

    return {
      text: message.content ?? "",
      sources,
      model: cfg.model,
      inputTokens,
      outputTokens,
      costUsdCents: 0, // backups aren't metered against the Claude spend cap
    };
  }

  // Hit the step cap — return whatever we have rather than erroring.
  return { text: "", sources, model: cfg.model, inputTokens, outputTokens, costUsdCents: 0 };
}

interface SimpleResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

/** A plain (no-tools) completion on an OpenAI-compatible provider. */
export async function simpleOpenAICompat(
  cfg: ProviderConfig,
  opts: { system: string; user: string; maxTokens?: number },
): Promise<SimpleResult> {
  const res = await fetch(`${cfg.baseURL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: opts.maxTokens ?? 300,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`${cfg.name} ${res.status}`);
  const data = (await res.json()) as {
    choices?: { message: { content: string | null } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  return {
    text: data.choices?.[0]?.message?.content ?? "",
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
  };
}

/** A vision completion (image + prompt) on an OpenAI-compatible provider. */
export async function visionOpenAICompat(
  cfg: ProviderConfig,
  opts: { system: string; prompt: string; dataBase64: string; mediaType: string; maxTokens?: number },
): Promise<SimpleResult> {
  const res = await fetch(`${cfg.baseURL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: cfg.visionModel,
      max_tokens: opts.maxTokens ?? 512,
      messages: [
        { role: "system", content: opts.system },
        {
          role: "user",
          content: [
            { type: "text", text: opts.prompt },
            { type: "image_url", image_url: { url: `data:${opts.mediaType};base64,${opts.dataBase64}` } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`${cfg.name} ${res.status}`);
  const data = (await res.json()) as {
    choices?: { message: { content: string | null } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  return {
    text: data.choices?.[0]?.message?.content ?? "",
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
  };
}
