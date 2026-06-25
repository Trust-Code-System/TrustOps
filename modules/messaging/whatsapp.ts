import "server-only";

import type { MessagingProvider, OutboundMessage, SendResult } from "./types";

/**
 * WhatsApp Business (Meta Cloud API) adapter.
 *
 * Until WHATSAPP_TOKEN + WHATSAPP_PHONE_ID are set (and Meta has approved the
 * business + templates), this performs a SIMULATED send — it logs and reports
 * success without any live external call. The queue/retry/dead-letter machinery
 * works end-to-end in dev without provider credentials. Only approved templates
 * should be used for business-initiated messages.
 */
export class WhatsAppProvider implements MessagingProvider {
  readonly name = "whatsapp";

  async send(message: OutboundMessage): Promise<SendResult> {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;

    if (!token || !phoneId) {
      console.info(
        `[whatsapp:simulated] → ${message.to ?? "(no number)"}: ${message.body}`,
      );
      return { ok: true, simulated: true, providerRef: "simulated" };
    }
    if (!message.to) return { ok: false, error: "No recipient phone number" };

    try {
      const res = await fetch(
        `https://graph.facebook.com/v20.0/${phoneId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: message.to,
            type: "text",
            text: { body: message.body },
          }),
        },
      );
      if (!res.ok) {
        return { ok: false, error: `WhatsApp API ${res.status}` };
      }
      const data = (await res.json()) as { messages?: { id: string }[] };
      return { ok: true, providerRef: data.messages?.[0]?.id };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "send failed" };
    }
  }
}
