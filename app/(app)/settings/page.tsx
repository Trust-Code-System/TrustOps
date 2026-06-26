import { createClient } from "@/lib/supabase/server";
import { requireSession, canManageOrg } from "@/modules/auth/session";
import { getNotificationSettings } from "@/modules/notifications/queries";
import { getAiSettings, getMonthSpendUsdCents } from "@/modules/ai/queries";
import type { Branch, Company, Profile } from "@/modules/shared/types";
import { CompanySection } from "./company-section";
import { BranchesSection } from "./branches-section";
import { StaffSection } from "./staff-section";
import { NotificationsSection } from "./notifications-section";
import { AiSection } from "./ai-section";
import { SettingsLayout, type SettingsTab } from "./settings-layout";

/**
 * Settings — company profile, branches, and staff. Role-gated: owners and
 * managers can manage everything; other roles see a read-only view. RLS scopes
 * every query to the caller's own company.
 */
export default async function SettingsPage() {
  const { profile } = await requireSession();
  const canManage = canManageOrg(profile.role);

  const supabase = createClient();
  const [
    { data: company },
    { data: branches },
    { data: staff },
    notifSettings,
    aiSettings,
    aiMonthSpend,
  ] = await Promise.all([
    supabase.from("companies").select("*").eq("id", profile.company_id).single(),
    supabase
      .from("branches")
      .select("*")
      .order("is_primary", { ascending: false })
      .order("name"),
    supabase.from("profiles").select("*").order("role").order("full_name"),
    getNotificationSettings(profile.company_id),
    getAiSettings(profile.company_id),
    getMonthSpendUsdCents(),
  ]);

  const maybeTabs: (SettingsTab | null)[] = [
    company
      ? {
          id: "company",
          label: "Company Profile",
          content: (
            <CompanySection company={company as Company} canManage={canManage} />
          ),
        }
      : null,
    {
      id: "branches",
      label: "Branches",
      content: (
        <BranchesSection
          branches={(branches as Branch[] | null) ?? []}
          canManage={canManage}
        />
      ),
    },
    {
      id: "staff",
      label: "Staff & Roles",
      content: (
        <StaffSection
          staff={(staff as Profile[] | null) ?? []}
          canManage={canManage}
          currentUserId={profile.id}
        />
      ),
    },
    {
      id: "notifications",
      label: "Notifications",
      content: <NotificationsSection settings={notifSettings} canManage={canManage} />,
    },
    {
      id: "ai",
      label: "AI Configuration",
      content: (
        <AiSection
          settings={aiSettings}
          monthSpendUsdCents={aiMonthSpend}
          isOwner={profile.role === "owner"}
        />
      ),
    },
  ];
  const tabs = maybeTabs.filter((t): t is SettingsTab => t !== null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display">Settings</h1>
        <p className="mt-1 text-body text-text-secondary">
          Manage your company configuration and preferences.
        </p>
      </div>

      <SettingsLayout tabs={tabs} />
    </div>
  );
}
