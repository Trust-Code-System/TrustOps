import "server-only";

import type { Notification } from "@/modules/shared/types";
import type { MessagingProvider, SendResult } from "./types";
import { WhatsAppProvider } from "./whatsapp";
import { EmailProvider } from "./email";
import { renderTemplate } from "./templates";

export type { MessagingProvider, SendResult, OutboundMessage } from "./types";

const providers: Record<string, MessagingProvider> = {
  whatsapp: new WhatsAppProvider(),
  email: new EmailProvider(),
};

/**
 * Deliver a notification through the right channel. in_app needs no external
 * send — its existence in the table IS the delivery. whatsapp/email go through
 * their adapter (simulated until keys are configured).
 */
export async function deliverNotification(n: Notification): Promise<SendResult> {
  if (n.channel === "in_app") return { ok: true };

  const provider = providers[n.channel];
  if (!provider) return { ok: false, error: `No provider for ${n.channel}` };

  return provider.send({
    channel: n.channel,
    to: n.target,
    body: renderTemplate(n.template, n.payload),
    companyId: n.company_id,
    template: n.template,
  });
}
