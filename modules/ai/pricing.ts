/**
 * Token → cost accounting for the assistant. Rates are USD cents per 1M tokens
 * (see the Claude model table). Cost is logged per company and capped, so this
 * stays integer-cents and never touches NGN kobo.
 */
export type TokenUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

type Rate = { input: number; output: number };

// USD cents per 1,000,000 tokens.
const RATES: Record<string, Rate> = {
  "claude-opus-4-8": { input: 500, output: 2500 },
  "claude-sonnet-4-6": { input: 300, output: 1500 },
  "claude-haiku-4-5": { input: 100, output: 500 },
};

const DEFAULT_RATE: Rate = RATES["claude-opus-4-8"];

export function rateFor(model: string): Rate {
  return RATES[model] ?? DEFAULT_RATE;
}

/** Cost of one model call in integer USD cents. Cache reads bill ~0.1×, cache
 *  writes ~1.25× of the input rate. */
export function costUsdCents(model: string, usage: TokenUsage): number {
  const r = rateFor(model);
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheCreate = usage.cache_creation_input_tokens ?? 0;
  const micro =
    usage.input_tokens * r.input +
    cacheRead * Math.round(r.input * 0.1) +
    cacheCreate * Math.round(r.input * 1.25) +
    usage.output_tokens * r.output;
  return Math.round(micro / 1_000_000);
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
