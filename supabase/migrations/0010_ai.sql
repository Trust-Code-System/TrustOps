-- TrustOps AI - Phase 6: AI assistant data model + RPCs.
-- Hard rules from the master spec, enforced in the DB (not prompts):
--   * Tenant isolation: every table carries company_id + RLS = auth_company_id().
--   * Conversation memory is scoped per company AND per user (user_id = auth.uid()).
--   * Read-mostly: the assistant never mutates money/stock; these tables only
--     hold chat history, usage accounting, and precomputed insights.
--   * Cost control: per-company spend is logged (ai_usage) and capped (ai_settings).
-- Note on currency: AI provider spend is genuinely USD, so it is stored as
-- integer USD cents (cost_usd_cents) — deliberately NOT kobo. Business money
-- stays kobo everywhere else; this is the one honest exception.

-- ---------------------------------------------------------------------------
-- ai_settings - per-company enable flag + monthly spend cap (USD cents).
-- ---------------------------------------------------------------------------
create table ai_settings (
  company_id            uuid primary key references companies(id) on delete cascade,
  enabled               boolean not null default true,
  monthly_cap_usd_cents bigint check (monthly_cap_usd_cents is null or monthly_cap_usd_cents >= 0),
  updated_at            timestamptz not null default now()
);
create trigger ai_settings_updated_at
  before update on ai_settings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- ai_conversations - one chat thread, scoped to a single user in a company.
-- ---------------------------------------------------------------------------
create table ai_conversations (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  title      text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index ai_conversations_owner_idx on ai_conversations(company_id, user_id, updated_at desc);
create trigger ai_conversations_updated_at
  before update on ai_conversations
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- ai_messages - chat turns. sources holds the tool figures behind an answer.
-- ---------------------------------------------------------------------------
create table ai_messages (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  sources         jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);
create index ai_messages_conversation_idx on ai_messages(conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- ai_usage - per-turn token + cost accounting (the spend log + cap source).
-- ---------------------------------------------------------------------------
create table ai_usage (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  user_id         uuid references profiles(id) on delete set null,
  conversation_id uuid references ai_conversations(id) on delete set null,
  model           text not null,
  input_tokens    integer not null default 0 check (input_tokens >= 0),
  output_tokens   integer not null default 0 check (output_tokens >= 0),
  cost_usd_cents  bigint not null default 0 check (cost_usd_cents >= 0),
  created_at      timestamptz not null default now()
);
create index ai_usage_company_created_idx on ai_usage(company_id, created_at desc);

-- ---------------------------------------------------------------------------
-- ai_insights - precomputed proactive cards (Phase 4 job over Phase 5 data).
-- Rule-based and grounded; regenerated daily. Service-role writes only.
-- ---------------------------------------------------------------------------
create table ai_insights (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  kind       text not null,
  severity   text not null check (severity in ('positive', 'warning', 'danger', 'neutral')),
  title      text not null,
  body       text not null,
  created_at timestamptz not null default now()
);
create index ai_insights_company_idx on ai_insights(company_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS — tenant isolation everywhere; conversations/messages/usage per-user.
-- ---------------------------------------------------------------------------
alter table ai_settings      enable row level security;
alter table ai_conversations enable row level security;
alter table ai_messages      enable row level security;
alter table ai_usage         enable row level security;
alter table ai_insights      enable row level security;

create policy ai_settings_select on ai_settings
  for select using (company_id = auth_company_id());

-- Conversations + messages: company AND owner. One user can never read another
-- user's threads, even within the same company (no cross-user memory).
create policy ai_conversations_select on ai_conversations
  for select using (company_id = auth_company_id() and user_id = auth.uid());
create policy ai_conversations_insert on ai_conversations
  for insert with check (company_id = auth_company_id() and user_id = auth.uid());
create policy ai_conversations_update on ai_conversations
  for update using (company_id = auth_company_id() and user_id = auth.uid())
  with check (company_id = auth_company_id() and user_id = auth.uid());

create policy ai_messages_select on ai_messages
  for select using (company_id = auth_company_id() and user_id = auth.uid());
create policy ai_messages_insert on ai_messages
  for insert with check (company_id = auth_company_id() and user_id = auth.uid());

-- Usage: a user logs their own turns; owners/managers can read all company spend.
create policy ai_usage_select on ai_usage
  for select using (
    company_id = auth_company_id()
    and (
      user_id = auth.uid()
      or exists (
        select 1 from profiles p
        where p.id = auth.uid() and p.role in ('owner', 'manager')
      )
    )
  );
create policy ai_usage_insert on ai_usage
  for insert with check (company_id = auth_company_id() and user_id = auth.uid());

-- Insights are read-only to the company; written by the service-role job.
create policy ai_insights_select on ai_insights
  for select using (company_id = auth_company_id());

grant select on ai_settings, ai_insights to authenticated;
grant select, insert, update on ai_conversations to authenticated;
grant select, insert on ai_messages, ai_usage to authenticated;

-- ---------------------------------------------------------------------------
-- save_ai_settings - enable flag + monthly cap. Owner only; audited (it is a
-- permission/cost-control change, so it follows the audit rule).
-- ---------------------------------------------------------------------------
create or replace function save_ai_settings(p_enabled boolean, p_cap_usd_cents bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_company uuid := auth_company_id();
  v_role    user_role;
begin
  if v_uid is null or v_company is null then
    raise exception 'Not authenticated';
  end if;
  select role into v_role from profiles where id = v_uid and is_active;
  if v_role <> 'owner' then
    raise exception 'Only the owner can change AI settings';
  end if;
  if p_cap_usd_cents is not null and p_cap_usd_cents < 0 then
    raise exception 'Spend cap cannot be negative';
  end if;

  insert into ai_settings (company_id, enabled, monthly_cap_usd_cents)
  values (v_company, coalesce(p_enabled, true), p_cap_usd_cents)
  on conflict (company_id) do update
    set enabled = excluded.enabled,
        monthly_cap_usd_cents = excluded.monthly_cap_usd_cents;

  insert into audit_logs (company_id, actor_id, entity_type, entity_id, action, metadata)
  values (
    v_company, v_uid, 'ai_settings', v_company, 'ai.settings_updated',
    jsonb_build_object('enabled', p_enabled, 'monthly_cap_usd_cents', p_cap_usd_cents)
  );

  return (select to_jsonb(s) from ai_settings s where s.company_id = v_company);
end;
$$;

-- ---------------------------------------------------------------------------
-- ai_month_usd_cents - the caller's company spend in the current calendar
-- month (UTC). Drives the budget gate. Scoped to the caller's company.
-- ---------------------------------------------------------------------------
create or replace function ai_month_usd_cents()
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(sum(cost_usd_cents), 0)::bigint
  from ai_usage
  where company_id = auth_company_id()
    and created_at >= date_trunc('month', now());
$$;

grant execute on function save_ai_settings(boolean, bigint) to authenticated;
grant execute on function ai_month_usd_cents() to authenticated;

-- Daily proactive-insights generation runs on the Phase 4 jobs engine.
insert into scheduled_jobs (name, type, interval_seconds)
values ('ai_insights', 'ai_insights', 86400)
on conflict (name) do nothing;
