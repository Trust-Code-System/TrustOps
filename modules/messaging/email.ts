import "server-only";

import type { MessagingProvider, OutboundMessage, SendResult } from "./types";

/**
 * Email adapter (Resend). Simulated until RESEND_API_KEY is set — same contract
 * as the WhatsApp adapter, so the pipeline works without credentials in dev.
 */
export class EmailProvider implements MessagingProvider {
  readonly name = "email";

  async send(message: OutboundMessage): Promise<SendResult> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM ?? "TrustOps <noreply@trustops.app>";

    if (!apiKey) {
      console.info(
        `[email:simulated] → ${message.to ?? "(no address)"}: ${message.body}`,
      );
      return { ok: true, simulated: true, providerRef: "simulated" };
    }
    if (!message.to) return { ok: false, error: "No recipient email" };

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: message.to,
          subject: `TrustOps · ${message.template}`,
          text: message.body,
        }),
      });
      if (!res.ok) return { ok: false, error: `Email API ${res.status}` };
      const data = (await res.json()) as { id?: string };
      return { ok: true, providerRef: data.id };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "send failed" };
    }
  }
}
