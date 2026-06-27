import "server-only";

import crypto from "node:crypto";
import type { PaymentMethod, PaymentProvider } from "@/modules/shared/types";

/**
 * Payments module — online charge gateway (Phase 3).
 *
 * Mirrors the messaging module's adapter pattern: a single `PaymentGateway`
 * interface with provider implementations, and a **simulated** no-op fallback
 * used until real keys are configured (so the whole flow is testable offline).
 * Gateway API keys live in env, never in the DB. Manual/offline payments still
 * use record_payment (Phase 1); this is for hosted-checkout charges only.
 */

export type GatewayProvider = PaymentProvider;

export interface ChargeRequest {
  companyId: string;
  invoiceId: string;
  amountKobo: number;
  customerEmail?: string | null;
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
}

/** Normalised webhook event, gateway-agnostic. */
export interface WebhookEvent {
  reference: string;
  providerReference: string | null;
  amountKobo: number;
  status: "success" | "failed";
  method: PaymentMethod;
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

// ---------------------------------------------------------------------------
// Simulated gateway — default until real keys are set (parallels messaging's
// simulated send). Produces a local "checkout" URL and a fake reference.
// ---------------------------------------------------------------------------
class SimulatedGateway implements PaymentGateway {
  readonly provider = "simulated" as const;
  async initializeCharge(req: ChargeRequest): Promise<ChargeResult> {
    return {
      status: "pending",
      authorizationUrl: `${siteUrl()}/pay/${req.reference}`,
      providerReference: `SIM_${req.reference}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Paystack — amounts are in kobo (NGN minor unit), same as our storage.
// ---------------------------------------------------------------------------
class PaystackGateway implements PaymentGateway {
  readonly provider = "paystack" as const;
  constructor(private readonly secretKey: string) {}

  async initializeCharge(req: ChargeRequest): Promise<ChargeResult> {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: req.customerEmail ?? "customer@example.com",
        amount: req.amountKobo,
        reference: req.reference,
        callback_url: `${siteUrl()}/invoices`,
      }),
    });
    const json = (await res.json()) as {
      status?: boolean;
      data?: { authorization_url?: string; reference?: string };
    };
    if (!res.ok || !json.status || !json.data?.authorization_url) {
      return { status: "failed" };
    }
    return {
      status: "pending",
      authorizationUrl: json.data.authorization_url,
      providerReference: json.data.reference ?? req.reference,
    };
  }
}

// ---------------------------------------------------------------------------
// Monnify — amounts are in NGN major units; convert kobo <-> naira.
// ---------------------------------------------------------------------------
class MonnifyGateway implements PaymentGateway {
  readonly provider = "monnify" as const;
  constructor(
    private readonly apiKey: string,
    private readonly secretKey: string,
    private readonly contractCode: string,
    private readonly baseUrl: string,
  ) {}

  private async token(): Promise<string | null> {
    const basic = Buffer.from(`${this.apiKey}:${this.secretKey}`).toString("base64");
    const res = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { Authorization: `Basic ${basic}` },
    });
    const json = (await res.json()) as { responseBody?: { accessToken?: string } };
    return json.responseBody?.accessToken ?? null;
  }

  async initializeCharge(req: ChargeRequest): Promise<ChargeResult> {
    const token = await this.token();
    if (!token) return { status: "failed" };
    const res = await fetch(`${this.baseUrl}/api/v1/merchant/transactions/init-transaction`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: req.amountKobo / 100,
        customerEmail: req.customerEmail ?? "customer@example.com",
        paymentReference: req.reference,
        paymentDescription: `Invoice ${req.invoiceId}`,
        contractCode: this.contractCode,
        currencyCode: "NGN",
        redirectUrl: `${siteUrl()}/invoices`,
      }),
    });
    const json = (await res.json()) as {
      requestSuccessful?: boolean;
      responseBody?: { checkoutUrl?: string; transactionReference?: string };
    };
    if (!res.ok || !json.requestSuccessful || !json.responseBody?.checkoutUrl) {
      return { status: "failed" };
    }
    return {
      status: "pending",
      authorizationUrl: json.responseBody.checkoutUrl,
      providerReference: json.responseBody.transactionReference ?? req.reference,
    };
  }
}

/** Pick the active gateway from env. No keys ⇒ simulated (offline-safe). */
export function getPaymentGateway(): PaymentGateway {
  const want = process.env.PAYMENTS_PROVIDER;
  const paystackKey = process.env.PAYSTACK_SECRET_KEY;
  const monnify = {
    apiKey: process.env.MONNIFY_API_KEY,
    secret: process.env.MONNIFY_SECRET_KEY,
    contract: process.env.MONNIFY_CONTRACT_CODE,
    base: process.env.MONNIFY_BASE_URL ?? "https://api.monnify.com",
  };

  if ((want === "paystack" || !want) && paystackKey) return new PaystackGateway(paystackKey);
  if ((want === "monnify" || !want) && monnify.apiKey && monnify.secret && monnify.contract) {
    return new MonnifyGateway(monnify.apiKey, monnify.secret, monnify.contract, monnify.base);
  }
  return new SimulatedGateway();
}

/** Verify a webhook payload's signature for the given provider. */
export function verifyWebhookSignature(
  provider: string,
  rawBody: string,
  signature: string | null,
): boolean {
  if (provider === "paystack") {
    const key = process.env.PAYSTACK_SECRET_KEY;
    if (!key || !signature) return false;
    const expected = crypto.createHmac("sha512", key).update(rawBody).digest("hex");
    return timingSafeEqual(expected, signature);
  }
  if (provider === "monnify") {
    const key = process.env.MONNIFY_SECRET_KEY;
    if (!key || !signature) return false;
    const expected = crypto.createHmac("sha512", key).update(rawBody).digest("hex");
    return timingSafeEqual(expected, signature);
  }
  // Simulated: only trust in non-production (local testing of the flow).
  if (provider === "simulated") return process.env.NODE_ENV !== "production";
  return false;
}

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/** Map a provider's raw webhook body to our normalised event. */
export function parseWebhookEvent(provider: string, body: unknown): WebhookEvent | null {
  const b = body as Record<string, any>;
  if (provider === "paystack") {
    const d = b?.data;
    if (!d?.reference) return null;
    return {
      reference: String(d.reference),
      providerReference: d.id ? String(d.id) : String(d.reference),
      amountKobo: Number(d.amount ?? 0),
      status: b.event === "charge.success" && d.status === "success" ? "success" : "failed",
      method: "card",
    };
  }
  if (provider === "monnify") {
    const d = b?.eventData;
    if (!d?.paymentReference) return null;
    return {
      reference: String(d.paymentReference),
      providerReference: d.transactionReference ? String(d.transactionReference) : null,
      amountKobo: Math.round(Number(d.amountPaid ?? 0) * 100),
      status: d.paymentStatus === "PAID" ? "success" : "failed",
      method: "transfer",
    };
  }
  if (provider === "simulated") {
    if (!b?.reference) return null;
    return {
      reference: String(b.reference),
      providerReference: b.providerReference ? String(b.providerReference) : null,
      amountKobo: Number(b.amountKobo ?? 0),
      status: b.status === "success" ? "success" : "failed",
      method: "transfer",
    };
  }
  return null;
}
