import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { WhatsAppProvider } from "@/modules/messaging/whatsapp";
import { handleInboundText } from "@/modules/whatsapp/inbound";

// node:crypto + service-role client require the Node runtime.
export const runtime = "nodejs";

/**
 * WhatsApp Cloud API webhook.
 *   GET  → Meta's subscription verification handshake.
 *   POST → inbound messages → command router → reply (free-form text).
 *
 * Set WHATSAPP_VERIFY_TOKEN (your choice, entered in the Meta dashboard) and
 * WHATSAPP_APP_SECRET (Meta app secret, for signature verification).
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("forbidden", { status: 403 });
}

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production"; // dev: accept unsigned
  if (!signature) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

interface InboundMessage {
  from: string;
  type: string;
  text?: { body: string };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifySignature(rawBody, req.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Collect text messages across the (usually single) entry/change array.
  const messages: InboundMessage[] = [];
  for (const entry of body?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      for (const m of change?.value?.messages ?? []) {
        if (m?.type === "text" && m?.from) messages.push(m as InboundMessage);
      }
    }
  }

  // Ack fast; process inline (volumes are low for SME chat).
  const provider = new WhatsAppProvider();
  await Promise.all(
    messages.map(async (m) => {
      try {
        const reply = await handleInboundText({ fromPhone: m.from, text: m.text?.body ?? "" });
        await provider.send({
          channel: "whatsapp",
          to: m.from,
          body: reply,
          companyId: "",
          template: "inbound_reply",
        });
      } catch {
        /* never let one message fail the whole webhook */
      }
    }),
  );

  return NextResponse.json({ ok: true });
}
