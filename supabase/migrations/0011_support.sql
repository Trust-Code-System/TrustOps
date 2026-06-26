-- TrustOps AI — Help Center support requests
-- Cross-tenant by design: these are messages from any company TO the platform
-- operator. RLS is ENABLED but intentionally has NO policies, so no tenant can
-- read another tenant's reports (or even its own) through the normal client.
-- All access runs through trusted server actions using the service-role client,
-- which is gated in application code to the platform admin. This mirrors the
-- service-role pattern already used for sign-up bootstrap (see lib/supabase/admin.ts).

create table support_requests (
  id          uuid primary key default gen_random_uuid(),
  -- Nullable + on delete set null so a report survives the reporter or their
  -- company being removed; the platform operator still needs the history.
  company_id  uuid references companies(id) on delete set null,
  user_id     uuid references profiles(id) on delete set null,
  -- Snapshotted at submit time so the report is self-contained even if the
  -- profile/company is later renamed or deleted.
  company_name text,
  name        text not null check (length(btrim(name)) > 0),
  email       text,
  subject     text not null check (length(btrim(subject)) > 0),
  message     text not null check (length(btrim(message)) > 0),
  status      text not null default 'open' check (status in ('open', 'resolved')),
  created_at  timestamptz not null default now()
);

create index support_requests_status_created_idx
  on support_requests(status, created_at desc);

-- Enabled with no policies: only the service-role bypasses RLS. Every read and
-- write goes through application code that first verifies the platform admin.
alter table support_requests enable row level security;
