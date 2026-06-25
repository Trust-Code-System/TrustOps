-- TrustOps AI — Phase 4: Automation & background jobs (schema)
-- A durable Postgres-backed job queue + a notifications outbox. Carry-forward
-- non-negotiables: company_id + RLS, audit, role gating, soft handling. All
-- queue/outbox writes happen via SECURITY DEFINER RPCs (0008) called by the
-- worker (service_role); clients only ever READ their company's rows.

create type notification_channel as enum ('whatsapp', 'email', 'in_app');
create type notification_status  as enum ('queued', 'sent', 'failed', 'delivered');
create type job_status           as enum ('queued', 'running', 'succeeded', 'failed', 'dead');

-- ---------------------------------------------------------------------------
-- notification_settings — per-company automation toggles, channels, cadence.
-- ---------------------------------------------------------------------------
create table notification_settings (
  company_id           uuid primary key references companies(id) on delete cascade,
  reminders_enabled    boolean not null default true,
  reminder_channel     notification_channel not null default 'in_app',
  reminder_days_before integer not null default 3 check (reminder_days_before >= 0),
  stock_alerts_enabled boolean not null default true,
  stock_alert_channel  notification_channel not null default 'in_app',
  daily_report_enabled boolean not null default true,
  daily_report_channel notification_channel not null default 'in_app',
  receipts_enabled     boolean not null default true,
  receipt_channel      notification_channel not null default 'in_app',
  quiet_hours_start    integer check (quiet_hours_start between 0 and 23),
  quiet_hours_end      integer check (quiet_hours_end between 0 and 23),
  sender_identity      text,
  updated_at           timestamptz not null default now()
);
create trigger notification_settings_updated_at
  before update on notification_settings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- notifications — the message outbox. Produced by handlers (idempotent via
-- dedupe_key), delivered by the dispatcher via a MessagingProvider with retry.
-- ---------------------------------------------------------------------------
create table notifications (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  channel       notification_channel not null,
  template      text not null,
  payload       jsonb not null default '{}'::jsonb,
  status        notification_status not null default 'queued',
  target        text,
  scheduled_for timestamptz not null default now(),
  sent_at       timestamptz,
  read_at       timestamptz,            -- for in_app
  error         text,
  attempts      integer not null default 0,
  dedupe_key    text,
  created_at    timestamptz not null default now()
);
create index notifications_company_idx on notifications(company_id);
create index notifications_dispatch_idx on notifications(status, scheduled_for);
create index notifications_inapp_idx on notifications(company_id, channel, read_at);
-- Idempotency: one notification per dedupe_key.
create unique index notifications_dedupe_unique
  on notifications(dedupe_key) where dedupe_key is not null;

-- ---------------------------------------------------------------------------
-- jobs — the durable work queue (event-driven + scheduled). Retry w/ backoff,
-- dead-letter after max_attempts.
-- ---------------------------------------------------------------------------
create table jobs (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid references companies(id) on delete cascade, -- null = system-wide
  type         text not null,
  payload      jsonb not null default '{}'::jsonb,
  status       job_status not null default 'queued',
  run_at       timestamptz not null default now(),
  attempts     integer not null default 0,
  max_attempts integer not null default 5,
  last_error   text,
  locked_at    timestamptz,
  locked_by    text,
  dedupe_key   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index jobs_claim_idx on jobs(status, run_at);
create index jobs_company_idx on jobs(company_id);
create unique index jobs_dedupe_unique
  on jobs(dedupe_key) where dedupe_key is not null;
create trigger jobs_updated_at
  before update on jobs
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- job_runs — per-attempt execution log (observability).
-- ---------------------------------------------------------------------------
create table job_runs (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references jobs(id) on delete cascade,
  company_id  uuid,
  attempt     integer not null,
  status      text not null, -- 'succeeded' | 'failed'
  error       text,
  finished_at timestamptz not null default now()
);
create index job_runs_job_idx on job_runs(job_id);
create index job_runs_company_idx on job_runs(company_id);

-- ---------------------------------------------------------------------------
-- scheduled_jobs — cron-like registry. The worker ticks this and enqueues work.
-- System-wide rows (no company_id); handlers fan out per company.
-- ---------------------------------------------------------------------------
create table scheduled_jobs (
  id               uuid primary key default gen_random_uuid(),
  name             text not null unique,
  type             text not null,
  interval_seconds integer not null check (interval_seconds > 0),
  enabled          boolean not null default true,
  last_run_at      timestamptz,
  next_run_at      timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger scheduled_jobs_updated_at
  before update on scheduled_jobs
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — clients READ their company's settings/notifications; admins read jobs
-- for observability. Queue internals (scheduled_jobs) are worker-only.
-- ---------------------------------------------------------------------------
alter table notification_settings enable row level security;
alter table notifications         enable row level security;
alter table jobs                  enable row level security;
alter table job_runs              enable row level security;
alter table scheduled_jobs        enable row level security;

create policy notification_settings_select on notification_settings
  for select using (company_id = auth_company_id());
create policy notification_settings_upsert on notification_settings
  for insert with check (company_id = auth_company_id() and auth_is_org_admin());
create policy notification_settings_update on notification_settings
  for update using (company_id = auth_company_id() and auth_is_org_admin())
  with check (company_id = auth_company_id());

create policy notifications_select on notifications
  for select using (company_id = auth_company_id());

create policy jobs_select on jobs
  for select using (company_id = auth_company_id() and auth_is_org_admin());
create policy job_runs_select on job_runs
  for select using (company_id = auth_company_id() and auth_is_org_admin());
-- scheduled_jobs: no policy → invisible to clients (worker uses service_role).

grant select on notification_settings, notifications, jobs, job_runs to authenticated;
grant insert, update on notification_settings to authenticated;

-- ---------------------------------------------------------------------------
-- Event-driven stock alerts: when an inventory row drops to/below its
-- threshold, enqueue a stock_alert job (deduped per product+branch+day).
-- SECURITY DEFINER so it can write the system jobs table from any context.
-- ---------------------------------------------------------------------------
create or replace function enqueue_low_stock_alert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.low_stock_threshold > 0
     and new.quantity <= new.low_stock_threshold
     and new.quantity < old.quantity then
    insert into jobs (company_id, type, payload, dedupe_key)
    values (
      new.company_id,
      'stock_alert',
      jsonb_build_object(
        'product_id', new.product_id,
        'branch_id', new.branch_id,
        'quantity', new.quantity,
        'threshold', new.low_stock_threshold
      ),
      'stock_alert:' || new.product_id || ':' || new.branch_id || ':' ||
        to_char(now(), 'YYYY-MM-DD')
    )
    on conflict (dedupe_key) do nothing;
  end if;
  return new;
end;
$$;

create trigger inventory_low_stock_alert
  after update on inventory
  for each row execute function enqueue_low_stock_alert();
