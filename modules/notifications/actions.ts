"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext, canManageOrg } from "@/modules/auth/session";
import type { ActionState } from "@/modules/auth/schemas";
import { enqueueJob } from "@/modules/jobs/queue";
import { notificationSettingsSchema } from "./schemas";

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.rpc("mark_notification_read", { p_id: id });
  revalidatePath("/dashboard");
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = createClient();
  await supabase.rpc("mark_all_notifications_read", {});
  revalidatePath("/dashboard");
}

/** Wire the Phase 1 "Send receipt" stub to the real queue (Phase 4). */
export async function sendReceipt(
  invoiceId: string,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getSessionContext();
  if (!ctx) return { ok: false, error: "Your session has expired. Log in again." };

  await enqueueJob("receipt_delivery", {
    companyId: ctx.profile.company_id,
    payload: { invoice_id: invoiceId },
    dedupeKey: `job:receipt:${invoiceId}`,
  });
  return { ok: true };
}

/** Update per-company notification settings. Org admins only. */
export async function updateNotificationSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Your session has expired. Log in again." };
  if (!canManageOrg(ctx.profile.role)) {
    return { error: "Only an owner or manager can change notifications" };
  }

  const bool = (k: string) => formData.get(k) === "on";
  const numOrNull = (k: string) => {
    const v = formData.get(k);
    return v === null || v === "" ? null : Number(v);
  };

  const parsed = notificationSettingsSchema.safeParse({
    remindersEnabled: bool("remindersEnabled"),
    reminderChannel: formData.get("reminderChannel"),
    reminderDaysBefore: Number(formData.get("reminderDaysBefore") ?? 3),
    stockAlertsEnabled: bool("stockAlertsEnabled"),
    stockAlertChannel: formData.get("stockAlertChannel"),
    dailyReportEnabled: bool("dailyReportEnabled"),
    dailyReportChannel: formData.get("dailyReportChannel"),
    receiptsEnabled: bool("receiptsEnabled"),
    receiptChannel: formData.get("receiptChannel"),
    quietHoursStart: numOrNull("quietHoursStart"),
    quietHoursEnd: numOrNull("quietHoursEnd"),
    senderIdentity: (formData.get("senderIdentity") as string)?.trim() || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid settings" };
  }
  const d = parsed.data;

  const supabase = createClient();
  // RLS confines the upsert to the caller's own company.
  const { error } = await supabase.from("notification_settings").upsert(
    {
      company_id: ctx.profile.company_id,
      reminders_enabled: d.remindersEnabled,
      reminder_channel: d.reminderChannel,
      reminder_days_before: d.reminderDaysBefore,
      stock_alerts_enabled: d.stockAlertsEnabled,
      stock_alert_channel: d.stockAlertChannel,
      daily_report_enabled: d.dailyReportEnabled,
      daily_report_channel: d.dailyReportChannel,
      receipts_enabled: d.receiptsEnabled,
      receipt_channel: d.receiptChannel,
      quiet_hours_start: d.quietHoursStart,
      quiet_hours_end: d.quietHoursEnd,
      sender_identity: d.senderIdentity,
    },
    { onConflict: "company_id" },
  );
  if (error) return { error: "Could not save notification settings" };

  revalidatePath("/settings");
  return { ok: true };
}
