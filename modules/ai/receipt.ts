"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/modules/auth/session";
import { getAiSettings } from "@/modules/ai/queries";
import { aiConfigured } from "@/modules/ai/orchestrator";
import { providerChain, fallbackOnlyChain } from "@/modules/ai/providers";
import { visionOpenAICompat } from "@/modules/ai/openai-compat";
import { costUsdCents } from "@/modules/ai/pricing";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const SYSTEM =
  "You extract structured data from a receipt or invoice image for a Nigerian business expense tracker. Reply with ONLY a JSON object, no prose, no code fences.";
const PROMPT =
  'Extract these fields and return JSON exactly: {"vendor": string, "amount": number (the TOTAL paid, in Naira, digits only), "date": "YYYY-MM-DD" (the receipt date; if absent use today), "category": one short word such as "Fuel","Transport","Supplies","Food","Utilities","Rent","Airtime","Other", "description": string up to 80 chars}. If the image is NOT a receipt or invoice, return {"error":"not a receipt"}.';

export interface ScannedExpense {
  vendor: string;
  category: string;
  amountKobo: number;
  spentAt: string; // YYYY-MM-DD
  description: string;
}

type Res = { ok: true; data: ScannedExpense } | { ok: false; error: string };

/**
 * Receipt-photo → structured expense via Claude vision. Read-only extraction:
 * it returns fields for the user to review and save (it never writes an expense
 * itself). Gated by AI config + the company's enable flag + monthly spend cap;
 * each call is logged to ai_usage so it counts toward that cap.
 */
export async function extractReceipt(input: {
  dataBase64: string;
  mediaType: string;
}): Promise<Res> {
  const ctx = await getSessionContext();
  if (!ctx) return { ok: false, error: "Your session has expired. Log in again." };
  if (!aiConfigured()) {
    return { ok: false, error: "AI isn't configured. Add an API key to enable receipt scanning." };
  }
  if (!ALLOWED.includes(input.mediaType)) {
    return { ok: false, error: "Upload a JPG, PNG, or WEBP image." };
  }

  const settings = await getAiSettings(ctx.profile.company_id);
  if (!settings.enabled) {
    return { ok: false, error: "AI is turned off. An owner can enable it in Settings." };
  }

  const supabase = createClient();
  // Claude cap hit → skip Claude and use a backup; never block.
  let capReached = false;
  if (settings.monthly_cap_usd_cents !== null) {
    const { data: spent } = await supabase.rpc("ai_month_usd_cents");
    capReached = Number(spent ?? 0) >= settings.monthly_cap_usd_cents;
  }
  const chain = capReached ? fallbackOnlyChain() : providerChain();

  // Try each provider in turn; any failure (credits, rate limit, vision error)
  // silently falls over to the next. No technical error reaches the user.
  let text = "";
  let usedModel = "";
  let inTok = 0;
  let outTok = 0;
  for (const cfg of chain) {
    try {
      if (cfg.kind === "anthropic") {
        const client = new Anthropic();
        const response = await client.messages.create({
          model: cfg.visionModel,
          max_tokens: 512,
          system: SYSTEM,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: input.mediaType as "image/jpeg", data: input.dataBase64 },
                },
                { type: "text", text: PROMPT },
              ],
            },
          ],
        });
        const raw = response.content.find((b) => b.type === "text");
        text = raw && raw.type === "text" ? raw.text : "";
        inTok = response.usage.input_tokens;
        outTok = response.usage.output_tokens;
      } else {
        const r = await visionOpenAICompat(cfg, {
          system: SYSTEM,
          prompt: PROMPT,
          dataBase64: input.dataBase64,
          mediaType: input.mediaType,
        });
        text = r.text;
        inTok = r.inputTokens;
        outTok = r.outputTokens;
      }
      if (text.trim()) {
        usedModel = cfg.visionModel;
        break;
      }
    } catch {
      text = ""; // try the next provider
    }
  }

  if (!usedModel || !text.trim()) {
    return { ok: false, error: "Couldn't read the receipt. Please enter it manually." };
  }

  // Log spend (only Claude counts toward the cap; backups are 0).
  await supabase.from("ai_usage").insert({
    company_id: ctx.profile.company_id,
    user_id: ctx.profile.id,
    conversation_id: null,
    model: usedModel,
    input_tokens: inTok,
    output_tokens: outTok,
    cost_usd_cents: usedModel.startsWith("claude")
      ? costUsdCents(usedModel, { input_tokens: inTok, output_tokens: outTok })
      : 0,
  });

  let parsed: { vendor?: unknown; amount?: unknown; date?: unknown; category?: unknown; description?: unknown; error?: unknown };
  try {
    parsed = JSON.parse(text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim());
  } catch {
    return { ok: false, error: "Couldn't read the receipt. Please enter it manually." };
  }
  if (parsed.error) {
    return { ok: false, error: "That doesn't look like a receipt. Please enter it manually." };
  }

  const amountNaira = Number(parsed.amount);
  if (!Number.isFinite(amountNaira) || amountNaira <= 0) {
    return { ok: false, error: "Couldn't read the amount. Please enter it manually." };
  }
  const dateStr = typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
    ? parsed.date
    : new Date().toISOString().slice(0, 10);

  return {
    ok: true,
    data: {
      vendor: String(parsed.vendor ?? "").slice(0, 80),
      category: (String(parsed.category ?? "Other").trim() || "Other").slice(0, 80),
      amountKobo: Math.round(amountNaira * 100),
      spentAt: dateStr,
      description: String(parsed.description ?? parsed.vendor ?? "").slice(0, 200),
    },
  };
}
