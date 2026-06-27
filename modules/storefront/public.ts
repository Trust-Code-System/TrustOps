import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/** Public catalog read via the SECURITY DEFINER get_public_catalog RPC. */
export interface CatalogProduct {
  name: string;
  category: string | null;
  unit: string;
  sell_price: number; // kobo
}

export interface PublicCatalog {
  company_name: string;
  whatsapp: string | null;
  products: CatalogProduct[];
}

export async function getPublicCatalog(token: string): Promise<PublicCatalog | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_public_catalog", { p_token: token });
  if (error || !data) return null;
  return data as unknown as PublicCatalog;
}
