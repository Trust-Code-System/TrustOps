import { redirect } from "next/navigation";
import { requireSession, canManageOrg } from "@/modules/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Company } from "@/modules/shared/types";
import { StorefrontManager } from "./storefront-manager";

export default async function StorefrontPage() {
  const { profile } = await requireSession();
  if (!canManageOrg(profile.role)) redirect("/dashboard");

  const supabase = createClient();
  // RLS confines this to the caller's own company.
  const { data } = await supabase
    .from("companies")
    .select("storefront_token, storefront_enabled, storefront_whatsapp")
    .eq("id", profile.company_id)
    .single();
  const company = data as Pick<
    Company,
    "storefront_token" | "storefront_enabled" | "storefront_whatsapp"
  > | null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-display">Storefront</h1>
        <p className="mt-1 text-body text-text-secondary">
          Publish a shareable catalog of your products. Customers browse and order on WhatsApp.
        </p>
      </div>
      <StorefrontManager
        initialEnabled={company?.storefront_enabled ?? false}
        initialWhatsapp={company?.storefront_whatsapp ?? ""}
        initialToken={company?.storefront_token ?? null}
      />
    </div>
  );
}
