import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext, isPlatformAdmin } from "@/modules/auth/session";
import {
  listInAppNotifications,
  unreadNotificationCount,
} from "@/modules/notifications/queries";
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

  return (
    <AppShell
      companyName={(company as Company | null)?.name ?? "TrustOps"}
      userName={ctx.profile.full_name}
      userRole={ctx.profile.role}
      branches={(branches as Branch[] | null) ?? []}
      notifications={notifications}
      unreadCount={unreadCount}
      isPlatformAdmin={isPlatformAdmin(ctx.email)}
    >
      {children}
    </AppShell>
  );
}
