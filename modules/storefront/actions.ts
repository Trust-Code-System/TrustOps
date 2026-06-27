"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext, canManageOrg } from "@/modules/auth/session";

type Res =
  | { ok: true; token: string; enabled: boolean; whatsapp: string | null }
  | { ok: false; error: string };

/** Enable/disable the public catalog and set the WhatsApp order number. */
export async function setStorefront(input: {
  enabled: boolean;
  whatsapp: string | null;
}): Promise<Res> {
  const ctx = await getSessionContext();
  if (!ctx) return { ok: false, error: "Your session has expired. Log in again." };
  if (!canManageOrg(ctx.profile.role)) {
    return { ok: false, error: "Only an owner or manager can manage the storefront" };
  }
  const supabase = createClient();
  const { data, error } = await supabase.rpc("set_storefront", {
    p_enabled: input.enabled,
    p_whatsapp: input.whatsapp,
  });
  if (error) return { ok: false, error: error.message };
  const r = data as { token: string; enabled: boolean; whatsapp: string | null };
  revalidatePath("/storefront");
  return { ok: true, token: r.token, enabled: r.enabled, whatsapp: r.whatsapp };
}
