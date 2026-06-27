import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext, isPlatformAdmin } from "@/modules/auth/session";
import {
  listInAppNotifications,
  unreadNotificationCount,
} from "@/modules/notifications/queries";
import { aiConfigured } from "@/modules/ai/orchestrator";
import { getAiSettings } from "@/modules/ai/queries";
import type { Branch, Company } from "@/modules/shared/types";

/**
 * Authenticated layout. Resolves the session (RLS-scoped) and renders the app
 * shell around every page. Middleware already gates unauthenticated access; this
 * also guards against a logged-in user with no profile yet.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  const supabase = createClient();
  // RLS guarantees these only ever return the user's own company + branches.
  const [{ data: company }, { data: branches }, notifications, unreadCount] =
    await Promise.all([
      supabase
        .from("companies")
        .select("*")
        .eq("id", ctx.profile.company_id)
        .single(),
      supabase
        .from("branches")
        .select("*")
        .order("is_primary", { ascending: false })
        .order("name", { ascending: true }),
      listInAppNotifications(20),
      unreadNotificationCount(),
    ]);

  // Drives whether the global copilot dock renders (configured + owner-enabled).
  const aiSettings = await getAiSettings(ctx.profile.company_id);

  return (
    <>
      {/* No-flash theme: apply the saved light preference before paint. Scoped to
          the app so the marketing landing + auth keep their dark canvas. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(localStorage.getItem('trustops.theme')==='light'){document.documentElement.dataset.theme='light'}}catch(e){}`,
        }}
      />
      <AppShell
        companyName={(company as Company | null)?.name ?? "TrustOps"}
        userName={ctx.profile.full_name}
        userRole={ctx.profile.role}
        branches={(branches as Branch[] | null) ?? []}
        notifications={notifications}
        unreadCount={unreadCount}
        isPlatformAdmin={isPlatformAdmin(ctx.email)}
        aiConfigured={aiConfigured()}
        aiEnabled={aiSettings.enabled}
      >
        {children}
      </AppShell>
    </>
  );
}
