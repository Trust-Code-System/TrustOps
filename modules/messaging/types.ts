import type { NotificationChannel } from "@/modules/shared/types";

export interface OutboundMessage {
  channel: NotificationChannel;
  to: string | null;
  /** Rendered, human-readable message body. */
  body: string;
  companyId: string;
  template: string;
  /**
   * WhatsApp business-initiated send. Meta only delivers a free-form text
   * message inside an open 24h customer-service window; to message a number
   * cold (e.g. alerting the operator) you must use a pre-approved template.
   * When present and credentials are set, the WhatsApp adapter sends this
   * template instead of `body`. Ignored by other channels.
   */
  whatsappTemplate?: {
    /** Approved template name in the Meta WhatsApp Manager. */
    name: string;
    /** Meta language code, e.g. "en" or "en_US". */
    language: string;
    /** Ordered body parameters that fill the template's {{1}}, {{2}}, … */
    bodyParams?: string[];
  };
}

export interface SendResult {
  ok: boolean;
  providerRef?: string;
  error?: string;
  /** True when no real provider is configured (simulated send). */
  simulated?: boolean;
}

/**
 * Provider-agnostic messaging adapter — the rest of the app talks only to this
 * interface (mirrors the payments adapter seam). Adding a provider later is one
 * new adapter, zero changes elsewhere.
 */
export interface MessagingProvider {
  readonly name: string;
  send(message: OutboundMessage): Promise<SendResult>;
}
