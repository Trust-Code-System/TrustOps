/**
 * Payments module — INTERFACE STUB ONLY (out of scope this phase).
 *
 * Paystack/Monnify integration is a later phase. This file defines the seam so
 * future work implements `PaymentGateway` without touching call sites. The
 * "Record payment" RPC handles manual/offline payments; this interface is for
 * online gateway charges only.
 */

export type GatewayProvider = "paystack" | "monnify";

export interface ChargeRequest {
  companyId: string;
  invoiceId: string;
  amountKobo: number;
  customerEmail?: string;
  reference: string;
}

export interface ChargeResult {
  status: "pending" | "success" | "failed";
  authorizationUrl?: string;
  providerReference?: string;
}

export interface PaymentGateway {
  readonly provider: GatewayProvider;
  initializeCharge(req: ChargeRequest): Promise<ChargeResult>;
  verifyCharge(reference: string): Promise<ChargeResult>;
}

/** Placeholder until a real gateway is wired up in a later phase. */
export const paymentGateway: PaymentGateway | null = null;
