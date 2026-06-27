import "server-only";

import type { AiSource } from "@/modules/shared/types";

/**
 * Provider fallback chain. Claude is primary; Groq and Gemini are backups that
 * pick up automatically when Claude is over budget or its API errors (e.g. out
 * of credits). Each backup speaks the OpenAI-compatible chat API, so one adapter
 * (openai-compat.ts) serves both. Configure by setting the relevant API keys.
 *
 * Order: Anthropic → Groq → Gemini (only providers with a key are included).
 */

export type ProviderName = "anthropic" | "groq" | "gemini";

export interface ProviderConfig {
  name: ProviderName;
  kind: "anthropic" | "openai";
  model: string;
  /** Vision-capable model for image tasks (receipt OCR). */
  visionModel: string;
  apiKey?: string;
  baseURL?: string;
}

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type OrchestratorResult = {
  text: string;
  sources: AiSource[];
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsdCents: number;
};

export interface RunOpts {
  system: string;
  history: ChatTurn[];
  userMessage: string;
}

/** Providers in fallback order. Empty if nothing is configured. */
export function providerChain(): ProviderConfig[] {
  const chain: ProviderConfig[] = [];

  if (process.env.ANTHROPIC_API_KEY) {
    chain.push({
      name: "anthropic",
      kind: "anthropic",
      model: process.env.AI_MODEL ?? "claude-opus-4-8",
      visionModel: process.env.AI_MODEL ?? "claude-opus-4-8",
    });
  }
  if (process.env.GROQ_API_KEY) {
    chain.push({
      name: "groq",
      kind: "openai",
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
      model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
      visionModel: process.env.GROQ_VISION_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct",
    });
  }
  if (process.env.GEMINI_API_KEY) {
    chain.push({
      name: "gemini",
      kind: "openai",
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
      model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
      visionModel: process.env.GEMINI_VISION_MODEL ?? "gemini-2.0-flash",
    });
  }
  return chain;
}

/** Any provider configured at all. */
export function aiConfigured(): boolean {
  return providerChain().length > 0;
}

/** The chain with Anthropic dropped — used when the company's Claude cap is hit. */
export function fallbackOnlyChain(): ProviderConfig[] {
  return providerChain().filter((p) => p.name !== "anthropic");
}
