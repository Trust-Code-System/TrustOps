import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Notification, NotificationSettings } from "@/modules/shared/types";

export function defaultSettings(companyId: string): NotificationSettings {
  return {
    company_id: companyId,
    reminders_enabled: true,
    reminder_channel: "in_app",
    reminder_days_before: 3,
    stock_alerts_enabled: true,
    stock_alert_channel: "in_app",
    daily_report_enabled: true,
    daily_report_channel: "in_app",
    receipts_enabled: true,
    receipt_channel: "in_app",
    quiet_hours_start: null,
    quiet_hours_end: null,
    sender_identity: null,
    updated_at: new Date().toISOString(),
  };
}

/** Recent in-app notifications (RLS scopes to the user's company). */
export async function listInAppNotifications(limit = 20): Promise<Notification[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("channel", "in_app")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as Notification[] | null) ?? [];
}

export async function unreadNotificationCount(): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("channel", "in_app")
    .is("read_at", null);
  return count ?? 0;
}

export async function getNotificationSettings(
  companyId: string,
): Promise<NotificationSettings> {
  const supabase = createClient();
  const { data } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();
  return (data as NotificationSettings | null) ?? defaultSettings(companyId);
}
