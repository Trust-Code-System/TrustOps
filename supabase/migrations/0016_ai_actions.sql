-- TrustOps AI — copilot actions with confirmation (propose → approve → execute)
-- =============================================================================
-- The assistant stays read-only by default. When it wants to DO something
-- (send a reminder/receipt, record a payment, create a pay-link) it records a
-- PENDING proposal here — it never executes on its own. The user approves or
-- rejects; approval runs the action through the SAME RLS-scoped, role-gated
-- server actions a human uses. Every proposal + decision is scoped per company
-- AND per user (no cross-tenant/cross-user actions) and audit-logged.
--
-- Idempotent migration (create-if-not-exists + replace).
-- =============================================================================

create table if not exists ai_actions (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  conversation_id uuid references ai_conversations(id) on delete set null,
  type            text not null
                    check (type in ('send_reminder', 'send_receipt', 'record_payment', 'create_payment_link')),
  params          jsonb not null default '{}'::jsonb,
  summary         text not null,
  status          text not null default 'pending'
                    check (status in ('pending', 'approved', 'rejected', 'executed', 'failed')),
  result          jsonb,
  created_at      timestamptz not null default now(),
  decided_at      timestamptz
);
create index if not exists ai_actions_company_user_idx on ai_actions(company_id, user_id);
create index if not exists ai_actions_conversation_idx on ai_actions(conversation_id);

alter table ai_actions enable row level security;

-- Per-company AND per-user: a user only ever sees/decides their own proposals.
drop policy if exists ai_actions_select on ai_actions;
create policy ai_actions_select on ai_actions
  for select using (company_id = auth_company_id() and user_id = auth.uid());

-- ===========================================================================
-- propose_ai_action — the assistant records a pending proposal (never executes).
-- ===========================================================================
create or replace function propose_ai_action(
  p_type         text,
  p_params       jsonb,
  p_summary      text,
  p_conversation uuid
)
returns ai_actions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_company uuid := auth_company_id();
  v_active  boolean;
  v_row     ai_actions;
begin
  if v_uid is null or v_company is null then
    raise exception 'Not authenticated';
  end if;
  select is_active into v_active from profiles where id = v_uid;
  if not coalesce(v_active, false) then
    raise exception 'Your account is not active';
  end if;
  if p_type not in ('send_reminder', 'send_receipt', 'record_payment', 'create_payment_link') then
    raise exception 'Unknown action type';
  end if;
  if coalesce(btrim(p_summary), '') = '' then
    raise exception 'A summary is required';
  end if;

  insert into ai_actions (company_id, user_id, conversation_id, type, params, summary)
  values (v_company, v_uid, p_conversation, p_type, coalesce(p_params, '{}'::jsonb), btrim(p_summary))
  returning * into v_row;

  insert into audit_logs (company_id, actor_id, entity_type, entity_id, action, metadata)
  values (v_company, v_uid, 'ai_action', v_row.id, 'ai_action.proposed',
          jsonb_build_object('type', p_type, 'params', p_params));

  return v_row;
end;
$$;

-- ===========================================================================
-- set_ai_action_status — record approve/reject/executed/failed. Caller-scoped.
-- ===========================================================================
create or replace function set_ai_action_status(
  p_id     uuid,
  p_status text,
  p_result jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_company uuid := auth_company_id();
begin
  if v_uid is null or v_company is null then
    raise exception 'Not authenticated';
  end if;
  if p_status not in ('approved', 'rejected', 'executed', 'failed') then
    raise exception 'Invalid status';
  end if;

  update ai_actions
     set status     = p_status,
         result     = coalesce(p_result, result),
         decided_at = now()
   where id = p_id
     and company_id = v_company
     and user_id = v_uid;            -- only the owning user can decide
  if not found then
    raise exception 'Action not found';
  end if;

  insert into audit_logs (company_id, actor_id, entity_type, entity_id, action, metadata)
  values (v_company, v_uid, 'ai_action', p_id, 'ai_action.' || p_status,
          coalesce(p_result, '{}'::jsonb));
end;
$$;

grant execute on function propose_ai_action(text, jsonb, text, uuid) to authenticated;
grant execute on function set_ai_action_status(uuid, text, jsonb) to authenticated;
