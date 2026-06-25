import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Job, Notification, NotificationChannel } from "@/modules/shared/types";

/**
 * Queue interface — the single seam in front of the background-work engine.
 * Today it is a Postgres-backed durable queue (SKIP LOCKED claim, retry with
 * backoff, dead-letter). Swapping to BullMQ/pg_cron later means reimplementing
 * this module only; handlers and callers don't change.
 *
 * Uses the service-role admin client (bypasses RLS) — background work runs
 * without a user session, scoped to company_id explicitly inside handlers.
 */

export async function enqueueJob(
  type: string,
  opts: {
    payload?: Record<string, unknown>;
    companyId?: string | null;
    runAt?: Date;
    dedupeKey?: string | null;
    maxAttempts?: number;
  } = {},
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.rpc("enqueue_job", {
    p_type: type,
    p_payload: opts.payload ?? {},
    p_company: opts.companyId ?? null,
    p_run_at: (opts.runAt ?? new Date()).toISOString(),
    p_dedupe: opts.dedupeKey ?? null,
    p_max: opts.maxAttempts ?? 5,
  });
  return (data as string | null) ?? null;
}

export async function enqueueNotification(opts: {
  companyId: string;
  channel: NotificationChannel;
  template: string;
  payload: Record<string, unknown>;
  target?: string | null;
  dedupeKey?: string | null;
  scheduledFor?: Date;
}): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.rpc("enqueue_notification", {
    p_company: opts.companyId,
    p_channel: opts.channel,
    p_template: opts.template,
    p_payload: opts.payload,
    p_target: opts.target ?? null,
    p_dedupe: opts.dedupeKey ?? null,
    p_scheduled: (opts.scheduledFor ?? new Date()).toISOString(),
  });
  return (data as string | null) ?? null;
}

export async function claimJob(worker: string): Promise<Job | null> {
  const admin = createAdminClient();
  const { data } = await admin.rpc("claim_job", { p_worker: worker });
  const rows = (data as Job[] | null) ?? [];
  return rows[0] ?? null;
}

export async function completeJob(id: string): Promise<void> {
  const admin = createAdminClient();
  await admin.rpc("complete_job", { p_job: id });
}

export async function failJob(id: string, error: string): Promise<void> {
  const admin = createAdminClient();
  await admin.rpc("fail_job", { p_job: id, p_error: error.slice(0, 500) });
}

export async function requeueStuckJobs(): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin.rpc("requeue_stuck_jobs", {});
  return (data as number | null) ?? 0;
}

export async function tickScheduler(): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin.rpc("tick_scheduler", {});
  return (data as number | null) ?? 0;
}

/** Due, unsent notifications for the dispatcher (service-role read). */
export async function claimDueNotifications(limit = 25): Promise<Notification[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("notifications")
    .select("*")
    .eq("status", "queued")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(limit);
  return (data as Notification[] | null) ?? [];
}

export async function markNotificationResult(
  id: string,
  ok: boolean,
  error?: string,
): Promise<void> {
  const admin = createAdminClient();
  await admin.rpc("mark_notification_result", {
    p_id: id,
    p_ok: ok,
    p_error: error ?? null,
  });
}
