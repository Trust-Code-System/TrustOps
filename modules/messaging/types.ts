import type { NotificationChannel } from "@/modules/shared/types";

export interface OutboundMessage {
  channel: NotificationChannel;
  to: string | null;
  /** Rendered, human-readable message body. */
  body: string;
  companyId: string;
  template: string;
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
