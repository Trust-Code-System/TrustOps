-- TrustOps AI — Row Level Security
-- Multi-tenancy enforced at the database level. There is no code path that can
-- read or write another company's rows. The tenancy rule is defined ONCE in
-- auth_company_id() and reused in every policy.

-- ---------------------------------------------------------------------------
-- Tenancy + role helpers (SECURITY DEFINER so they read profiles without
-- triggering RLS recursion; search_path locked for safety).
-- ---------------------------------------------------------------------------
create or replace function auth_company_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select company_id from profiles where id = auth.uid();
$$;

create or replace function auth_role()
returns user_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from profiles where id = auth.uid();
$$;

-- Only owner and manager may manage staff, branches, roles, and may archive.
create or replace function auth_is_org_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select role in ('owner', 'manager') from profiles where id = auth.uid()),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS on every domain table.
-- ---------------------------------------------------------------------------
alter table companies     enable row level security;
alter table branches      enable row level security;
alter table profiles      enable row level security;
alter table customers     enable row level security;
alter table invoices      enable row level security;
alter table invoice_items enable row level security;
alter table payments      enable row level security;
alter table audit_logs    enable row level security;

-- ---------------------------------------------------------------------------
-- companies — read your own; org admins can update it. No client insert/delete
-- (creation is done by bootstrap_company, a SECURITY DEFINER function).
-- ---------------------------------------------------------------------------
create policy companies_select on companies
  for select using (id = auth_company_id());
create policy companies_update on companies
  for update using (id = auth_company_id() and auth_is_org_admin())
  with check (id = auth_company_id());

-- ---------------------------------------------------------------------------
-- branches — read within company; org admins manage.
-- ---------------------------------------------------------------------------
create policy branches_select on branches
  for select using (company_id = auth_company_id());
create policy branches_insert on branches
  for insert with check (company_id = auth_company_id() and auth_is_org_admin());
create policy branches_update on branches
  for update using (company_id = auth_company_id() and auth_is_org_admin())
  with check (company_id = auth_company_id());
create policy branches_delete on branches
  for delete using (company_id = auth_company_id() and auth_is_org_admin());

-- ---------------------------------------------------------------------------
-- profiles — read colleagues; org admins manage. Self rows are created by
-- bootstrap_company / invite (SECURITY DEFINER / service role).
-- ---------------------------------------------------------------------------
create policy profiles_select on profiles
  for select using (company_id = auth_company_id());
create policy profiles_insert on profiles
  for insert with check (company_id = auth_company_id() and auth_is_org_admin());
create policy profiles_update on profiles
  for update using (company_id = auth_company_id() and auth_is_org_admin())
  with check (company_id = auth_company_id());

-- ---------------------------------------------------------------------------
-- customers — any company member can read/add/edit. Soft-delete (setting
-- deleted_at) is restricted to org admins: "staff can record customers but not
-- delete". No hard DELETE policy exists, so customers can never be hard-deleted.
-- ---------------------------------------------------------------------------
create policy customers_select on customers
  for select using (company_id = auth_company_id());
create policy customers_insert on customers
  for insert with check (company_id = auth_company_id());
create policy customers_update on customers
  for update using (company_id = auth_company_id())
  with check (
    company_id = auth_company_id()
    and (deleted_at is null or auth_is_org_admin())
  );

-- ---------------------------------------------------------------------------
-- invoices — read within company. Creation is via record_sale (SECURITY
-- DEFINER). Direct updates allowed for company members, but only org admins may
-- archive (set deleted_at). No hard DELETE policy.
-- ---------------------------------------------------------------------------
create policy invoices_select on invoices
  for select using (company_id = auth_company_id());
create policy invoices_update on invoices
  for update using (company_id = auth_company_id())
  with check (
    company_id = auth_company_id()
    and (deleted_at is null or auth_is_org_admin())
  );

-- ---------------------------------------------------------------------------
-- invoice_items, payments — read within company. Writes happen only inside the
-- record_sale / record_payment RPCs (SECURITY DEFINER), so no client write
-- policies exist: clients cannot fabricate line items or payments directly.
-- ---------------------------------------------------------------------------
create policy invoice_items_select on invoice_items
  for select using (company_id = auth_company_id());

create policy payments_select on payments
  for select using (company_id = auth_company_id());

-- ---------------------------------------------------------------------------
-- audit_logs — read within company (org admins). Written only by RPCs.
-- ---------------------------------------------------------------------------
create policy audit_logs_select on audit_logs
  for select using (company_id = auth_company_id() and auth_is_org_admin());

-- ---------------------------------------------------------------------------
-- Grants. Broad table grants to the authenticated role; RLS is the real gate.
-- (anon gets nothing on domain tables.) The `authenticated` role is provided by
-- Supabase; the test harness creates it before running migrations.
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function auth_company_id() to authenticated;
grant execute on function auth_role() to authenticated;
grant execute on function auth_is_org_admin() to authenticated;
