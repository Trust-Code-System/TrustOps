import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { PaymentProvider } from "@/modules/shared/types";

/**
 * Public (no-login) invoice/receipt view. Reads via the SECURITY DEFINER
 * `get_public_invoice` RPC, which returns ONLY a safe projection of the single
 * invoice behind an unguessable token — no other tenant data is reachable.
 */

export interface PublicInvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface PublicInvoice {
  reference: string;
  provider: PaymentProvider;
  intent_status: "pending" | "success" | "failed" | "expired";
  authorization_url: string | null;
  company_name: string;
  customer_name: string;
  invoice_number: string;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  balance: number;
  issued_at: string;
  items: PublicInvoiceItem[];
}

export async function getPublicInvoice(ref: string): Promise<PublicInvoice | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_public_invoice", { p_ref: ref });
  if (error || !data) return null;
  return data as unknown as PublicInvoice;
}
