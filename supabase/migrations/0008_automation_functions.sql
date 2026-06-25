-- TrustOps AI — Phase 4: queue/worker + notification RPCs
-- All SECURITY DEFINER with a locked search_path. Worker-only functions are
-- granted to service_role (the worker connects with the service-role key);
-- user-facing ones (mark read) to authenticated. EXECUTE revoked from PUBLIC so
-- anon/authenticated cannot drive the queue.

-- ===========================================================================
-- enqueue_job — durable enqueue. dedupe_key makes enqueues idempotent.
-- ===========================================================================
create or replace function enqueue_job(
  p_type    text,
  p_payload jsonb default '{}'::jsonb,
  p_company uuid default null,
  p_run_at  timestamptz default now(),
  p_dedupe  text default null,
  p_max     integer default 5
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  insert into jobs (company_id, type, payload, run_at, dedupe_key, max_attempts)
  values (p_company, p_type, coalesce(p_payload, '{}'::jsonb), p_run_at, p_dedupe, p_max)
  on conflict (dedupe_key) where dedupe_key is not null do nothing
  returning id into v_id;
  return v_id; -- null if it was a duplicate
end;
$$;

-- ===========================================================================
-- enqueue_notification — outbox insert, idempotent via dedupe_key.
-- ===========================================================================
create or replace function enqueue_notification(
  p_company   uuid,
  p_channel   notification_channel,
  p_template  text,
  p_payload   jsonb,
  p_target    text default null,
  p_dedupe    text default null,
  p_scheduled timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  insert into notifications (company_id, channel, template, payload, target, dedupe_key, scheduled_for)
  values (p_company, p_channel, p_template, coalesce(p_payload, '{}'::jsonb), p_target, p_dedupe, p_scheduled)
  on conflict (dedupe_key) where dedupe_key is not null do nothing
  returning id into v_id;
  return v_id;
end;
$$;

-- ===========================================================================
-- claim_job — atomically claim the next due job (safe for concurrent workers).
-- ===========================================================================
create or replace function claim_job(p_worker text)
returns setof jobs
language sql
security definer
set search_path = public, pg_temp
as $$
  update jobs set
    status = 'running',
    locked_at = now(),
    locked_by = p_worker,
    attempts = attempts + 1
  where id = (
    select id from jobs
    where status = 'queued' and run_at <= now()
    order by run_at
    for update skip locked
    limit 1
  )
  returning *;
$$;

-- complete_job — mark success + log the run.
create or replace function complete_job(p_job uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update jobs set status = 'succeeded', locked_at = null where id = p_job;
  insert into job_runs (job_id, company_id, attempt, status)
  select id, company_id, attempts, 'succeeded' from jobs where id = p_job;
end;
$$;

-- fail_job — retry with exponential backoff, dead-letter after max_attempts.
create or replace function fail_job(p_job uuid, p_error text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attempts integer;
  v_max      integer;
  v_company  uuid;
  v_status   job_status;
  v_backoff  integer;
begin
  select attempts, max_attempts, company_id into v_attempts, v_max, v_company
    from jobs where id = p_job;

  if v_attempts >= v_max then
    v_status := 'dead';            -- dead-letter: visible, not retried
  else
    v_status := 'queued';
  end if;
  v_backoff := least(power(2, v_attempts)::int * 60, 3600); -- cap at 1h

  update jobs set
    status = v_status,
    run_at = now() + make_interval(secs => v_backoff),
    last_error = p_error,
    locked_at = null
  where id = p_job;

  insert into job_runs (job_id, company_id, attempt, status, error)
  values (p_job, v_company, v_attempts, 'failed', p_error);
end;
$$;

-- requeue_stuck_jobs — crash recovery: jobs stuck 'running' past the visibility
-- timeout go back to 'queued' (handlers are idempotent, so re-running is safe).
create or replace function requeue_stuck_jobs(p_timeout interval default '5 minutes')
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_count integer;
begin
  update jobs set status = 'queued', locked_at = null
  where status = 'running' and locked_at < now() - p_timeout;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- tick_scheduler — enqueue any due scheduled jobs and advance their schedule.
create or replace function tick_scheduler()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare r record; v_count integer := 0;
begin
  for r in
    select * from scheduled_jobs where enabled and next_run_at <= now() for update
  loop
    perform enqueue_job(
      r.type, '{}'::jsonb, null, now(),
      r.name || ':' || to_char(now(), 'YYYY-MM-DD-HH24'), 5
    );
    update scheduled_jobs
       set last_run_at = now(),
           next_run_at = now() + make_interval(secs => r.interval_seconds)
     where id = r.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- mark_notification_result — dispatcher callback: sent, or retry/dead-letter.
create or replace function mark_notification_result(
  p_id    uuid,
  p_ok    boolean,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_attempts integer; v_backoff integer;
begin
  if p_ok then
    update notifications set status = 'sent', sent_at = now(), error = null
     where id = p_id;
  else
    select attempts into v_attempts from notifications where id = p_id;
    v_attempts := v_attempts + 1;
    v_backoff := least(power(2, v_attempts)::int * 60, 3600);
    update notifications set
      attempts = v_attempts,
      error = p_error,
      status = case when v_attempts >= 5 then 'failed'::notification_status
                    else 'queued'::notification_status end,
      scheduled_for = now() + make_interval(secs => v_backoff)
    where id = p_id;
  end if;
end;
$$;

-- transition_overdue_invoices — flip past-due unpaid/partial invoices to overdue.
create or replace function transition_overdue_invoices()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_count integer;
begin
  with upd as (
    update invoices set status = 'overdue'
    where status in ('unpaid', 'partial')
      and deleted_at is null
      and due_at is not null
      and due_at < now()
    returning id, company_id, invoice_number
  ),
  logged as (
    insert into audit_logs (company_id, actor_id, entity_type, entity_id, action, metadata)
    select company_id, null, 'invoice', id, 'invoice.overdue',
           jsonb_build_object('invoice_number', invoice_number)
    from upd
    returning 1
  )
  select count(*) into v_count from logged;
  return v_count;
end;
$$;

-- mark_notification_read / mark_all — user-facing (in-app bell).
create or replace function mark_notification_read(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update notifications set read_at = now()
   where id = p_id and company_id = auth_company_id() and channel = 'in_app';
end;
$$;

create or replace function mark_all_notifications_read()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update notifications set read_at = now()
   where company_id = auth_company_id() and channel = 'in_app' and read_at is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants: queue internals → service_role only; bell → authenticated.
-- ---------------------------------------------------------------------------
revoke execute on function
  enqueue_job(text, jsonb, uuid, timestamptz, text, integer),
  enqueue_notification(uuid, notification_channel, text, jsonb, text, text, timestamptz),
  claim_job(text), complete_job(uuid), fail_job(uuid, text),
  requeue_stuck_jobs(interval), tick_scheduler(),
  mark_notification_result(uuid, boolean, text),
  transition_overdue_invoices()
from public;

grant execute on function
  enqueue_job(text, jsonb, uuid, timestamptz, text, integer),
  enqueue_notification(uuid, notification_channel, text, jsonb, text, text, timestamptz),
  claim_job(text), complete_job(uuid), fail_job(uuid, text),
  requeue_stuck_jobs(interval), tick_scheduler(),
  mark_notification_result(uuid, boolean, text),
  transition_overdue_invoices()
to service_role;

grant execute on function
  mark_notification_read(uuid), mark_all_notifications_read()
to authenticated;

-- ---------------------------------------------------------------------------
-- Seed the recurring schedules (system-wide; handlers fan out per company).
-- ---------------------------------------------------------------------------
insert into scheduled_jobs (name, type, interval_seconds) values
  ('invoice_reminders', 'invoice_reminders', 86400),   -- daily
  ('daily_report',      'daily_report',      86400),   -- daily
  ('overdue_transition','overdue_transition', 3600);   -- hourly
