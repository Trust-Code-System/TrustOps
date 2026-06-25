-- TrustOps AI - Phase 5: Analytics schema, expense RPCs, and aggregation
-- Carry-forward non-negotiables: company_id + RLS, money as integer kobo,
-- soft delete for user-deletable expenses, audit logs, and role-gated writes.

-- ---------------------------------------------------------------------------
-- daily_metrics - cached read model for analytics dashboards.
-- branch_id null means company-wide. Unique NULLS NOT DISTINCT lets one
-- company-wide row exist per company/date while still allowing branch rows.
-- ---------------------------------------------------------------------------
create table daily_metrics (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  branch_id     uuid references branches(id) on delete cascade,
  date          date not null,
  revenue       bigint not null default 0 check (revenue >= 0),
  sales_count   integer not null default 0 check (sales_count >= 0),
  new_customers integer not null default 0 check (new_customers >= 0),
  expenses      bigint not null default 0 check (expenses >= 0),
  cogs          bigint not null default 0 check (cogs >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique nulls not distinct (company_id, branch_id, date)
);
create index daily_metrics_company_date_idx on daily_metrics(company_id, date desc);
create index daily_metrics_branch_date_idx on daily_metrics(company_id, branch_id, date desc);
create trigger daily_metrics_updated_at
  before update on daily_metrics
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- expenses - money out. Feeds profit/cashflow analytics.
-- ---------------------------------------------------------------------------
create table expenses (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  branch_id   uuid references branches(id) on delete set null,
  category    text not null check (length(btrim(category)) > 0),
  amount      bigint not null check (amount > 0),
  description text,
  spent_at    timestamptz not null default now(),
  created_by  uuid references profiles(id) on delete set null,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index expenses_company_spent_idx on expenses(company_id, spent_at desc);
create index expenses_company_category_idx on expenses(company_id, category);
create index expenses_branch_spent_idx on expenses(company_id, branch_id, spent_at desc);
create trigger expenses_updated_at
  before update on expenses
  for each row execute function set_updated_at();

alter table daily_metrics enable row level security;
alter table expenses      enable row level security;

create policy daily_metrics_select on daily_metrics
  for select using (company_id = auth_company_id());

create policy expenses_select on expenses
  for select using (company_id = auth_company_id());

-- Expense writes are intentionally RPC-only; no direct client insert/update.
grant select on daily_metrics, expenses to authenticated;

-- ---------------------------------------------------------------------------
-- save_expense - create/update an expense. Owner/manager/accountant only.
-- Payload: { id?, branch_id?, category, amount, description?, spent_at? }
-- ---------------------------------------------------------------------------
create or replace function save_expense(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_company  uuid := auth_company_id();
  v_role     user_role;
  v_id       uuid := nullif(p_payload->>'id', '')::uuid;
  v_branch   uuid := nullif(p_payload->>'branch_id', '')::uuid;
  v_category text := nullif(btrim(coalesce(p_payload->>'category', '')), '');
  v_amount   bigint := (p_payload->>'amount')::bigint;
  v_desc     text := nullif(btrim(coalesce(p_payload->>'description', '')), '');
  v_spent_at timestamptz := coalesce(nullif(p_payload->>'spent_at', '')::timestamptz, now());
  v_action   text;
begin
  if v_uid is null or v_company is null then
    raise exception 'Not authenticated';
  end if;
  select role into v_role from profiles where id = v_uid and is_active;
  if v_role not in ('owner', 'manager', 'accountant') then
    raise exception 'Only an owner, manager, or accountant can manage expenses';
  end if;
  if v_category is null then
    raise exception 'Expense category is required';
  end if;
  if v_amount is null or v_amount <= 0 then
    raise exception 'Expense amount must be greater than zero';
  end if;
  if v_branch is not null and not exists (
    select 1 from branches where id = v_branch and company_id = v_company
  ) then
    raise exception 'Branch not found in your company';
  end if;

  if v_id is null then
    insert into expenses
      (company_id, branch_id, category, amount, description, spent_at, created_by)
    values
      (v_company, v_branch, v_category, v_amount, v_desc, v_spent_at, v_uid)
    returning id into v_id;
    v_action := 'expense.created';
  else
    update expenses set
      branch_id = v_branch,
      category = v_category,
      amount = v_amount,
      description = v_desc,
      spent_at = v_spent_at
    where id = v_id and company_id = v_company and deleted_at is null;
    if not found then
      raise exception 'Expense not found in your company';
    end if;
    v_action := 'expense.updated';
  end if;

  insert into audit_logs (company_id, actor_id, entity_type, entity_id, action, metadata)
  values (
    v_company, v_uid, 'expense', v_id, v_action,
    jsonb_build_object('category', v_category, 'amount', v_amount, 'branch_id', v_branch)
  );

  return (select to_jsonb(e) from expenses e where e.id = v_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- archive_expense - soft delete an expense. Owner/manager/accountant only.
-- ---------------------------------------------------------------------------
create or replace function archive_expense(p_expense_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_company uuid := auth_company_id();
  v_role    user_role;
  v_amount  bigint;
begin
  if v_uid is null or v_company is null then
    raise exception 'Not authenticated';
  end if;
  select role into v_role from profiles where id = v_uid and is_active;
  if v_role not in ('owner', 'manager', 'accountant') then
    raise exception 'Only an owner, manager, or accountant can archive expenses';
  end if;

  update expenses
     set deleted_at = now()
   where id = p_expense_id and company_id = v_company and deleted_at is null
  returning amount into v_amount;
  if not found then
    raise exception 'Expense not found in your company';
  end if;

  insert into audit_logs (company_id, actor_id, entity_type, entity_id, action, metadata)
  values (
    v_company, v_uid, 'expense', p_expense_id, 'expense.archived',
    jsonb_build_object('amount', v_amount)
  );
end;
$$;

grant execute on function save_expense(jsonb) to authenticated;
grant execute on function archive_expense(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- aggregate_daily_metrics - rebuild cached daily rows for a date window.
-- Revenue is payment-date based. Sales/COGS are invoice-date based. Expenses
-- are spent-date based. The function is idempotent and safe to rerun.
-- ---------------------------------------------------------------------------
create or replace function aggregate_daily_metrics(
  p_from date default current_date - 30,
  p_to   date default current_date
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'Invalid metrics date range';
  end if;

  delete from daily_metrics where date between p_from and p_to;

  with
  revenue_company as (
    select p.company_id, null::uuid as branch_id, p.paid_at::date as date, sum(p.amount)::bigint as revenue
    from payments p
    where p.paid_at::date between p_from and p_to
    group by p.company_id, p.paid_at::date
  ),
  revenue_branch as (
    select p.company_id, i.branch_id, p.paid_at::date as date, sum(p.amount)::bigint as revenue
    from payments p
    join invoices i on i.id = p.invoice_id
    where p.paid_at::date between p_from and p_to
      and i.branch_id is not null
    group by p.company_id, i.branch_id, p.paid_at::date
  ),
  revenue as (
    select * from revenue_company
    union all
    select * from revenue_branch
  ),
  sales_company as (
    select company_id, null::uuid as branch_id, issued_at::date as date, count(*)::int as sales_count
    from invoices
    where issued_at::date between p_from and p_to
      and deleted_at is null
    group by company_id, issued_at::date
  ),
  sales_branch as (
    select company_id, branch_id, issued_at::date as date, count(*)::int as sales_count
    from invoices
    where issued_at::date between p_from and p_to
      and deleted_at is null
      and branch_id is not null
    group by company_id, branch_id, issued_at::date
  ),
  sales as (
    select * from sales_company
    union all
    select * from sales_branch
  ),
  new_customers as (
    select company_id, null::uuid as branch_id, created_at::date as date, count(*)::int as new_customers
    from customers
    where created_at::date between p_from and p_to
    group by company_id, created_at::date
  ),
  expense_company as (
    select company_id, null::uuid as branch_id, spent_at::date as date, sum(amount)::bigint as expenses
    from expenses
    where spent_at::date between p_from and p_to
      and deleted_at is null
    group by company_id, spent_at::date
  ),
  expense_branch as (
    select company_id, branch_id, spent_at::date as date, sum(amount)::bigint as expenses
    from expenses
    where spent_at::date between p_from and p_to
      and deleted_at is null
      and branch_id is not null
    group by company_id, branch_id, spent_at::date
  ),
  expense_totals as (
    select * from expense_company
    union all
    select * from expense_branch
  ),
  cogs_company as (
    select i.company_id, null::uuid as branch_id, i.issued_at::date as date,
           coalesce(sum(ii.quantity * p.cost_price), 0)::bigint as cogs
    from invoices i
    join invoice_items ii on ii.invoice_id = i.id
    join products p on p.id = ii.product_id
    where i.issued_at::date between p_from and p_to
      and i.deleted_at is null
    group by i.company_id, i.issued_at::date
  ),
  cogs_branch as (
    select i.company_id, i.branch_id, i.issued_at::date as date,
           coalesce(sum(ii.quantity * p.cost_price), 0)::bigint as cogs
    from invoices i
    join invoice_items ii on ii.invoice_id = i.id
    join products p on p.id = ii.product_id
    where i.issued_at::date between p_from and p_to
      and i.deleted_at is null
      and i.branch_id is not null
    group by i.company_id, i.branch_id, i.issued_at::date
  ),
  cogs_totals as (
    select * from cogs_company
    union all
    select * from cogs_branch
  ),
  metric_keys as (
    select company_id, branch_id, date from revenue
    union
    select company_id, branch_id, date from sales
    union
    select company_id, branch_id, date from new_customers
    union
    select company_id, branch_id, date from expense_totals
    union
    select company_id, branch_id, date from cogs_totals
  )
  insert into daily_metrics
    (company_id, branch_id, date, revenue, sales_count, new_customers, expenses, cogs)
  select
    k.company_id,
    k.branch_id,
    k.date,
    coalesce(r.revenue, 0),
    coalesce(s.sales_count, 0),
    coalesce(nc.new_customers, 0),
    coalesce(ex.expenses, 0),
    coalesce(cg.cogs, 0)
  from metric_keys k
  left join revenue r on r.company_id = k.company_id
    and r.branch_id is not distinct from k.branch_id and r.date = k.date
  left join sales s on s.company_id = k.company_id
    and s.branch_id is not distinct from k.branch_id and s.date = k.date
  left join new_customers nc on nc.company_id = k.company_id
    and nc.branch_id is not distinct from k.branch_id and nc.date = k.date
  left join expense_totals ex on ex.company_id = k.company_id
    and ex.branch_id is not distinct from k.branch_id and ex.date = k.date
  left join cogs_totals cg on cg.company_id = k.company_id
    and cg.branch_id is not distinct from k.branch_id and cg.date = k.date;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function aggregate_daily_metrics(date, date) from public;
grant execute on function aggregate_daily_metrics(date, date) to service_role;

-- Efficient, scoped leaderboard reads for the analytics dashboard.
create or replace function analytics_top_products(
  p_from  date,
  p_to    date,
  p_limit integer default 5
)
returns table (
  product_id uuid,
  product_name text,
  quantity_sold bigint,
  revenue bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p.id,
    p.name,
    sum(ii.quantity)::bigint as quantity_sold,
    sum(ii.line_total)::bigint as revenue
  from invoice_items ii
  join invoices i on i.id = ii.invoice_id
  join products p on p.id = ii.product_id
  where i.company_id = auth_company_id()
    and i.deleted_at is null
    and i.issued_at::date between p_from and p_to
  group by p.id, p.name
  order by revenue desc, quantity_sold desc, p.name
  limit greatest(1, least(coalesce(p_limit, 5), 50));
$$;

create or replace function analytics_top_customers(
  p_from  date,
  p_to    date,
  p_limit integer default 5
)
returns table (
  customer_id uuid,
  customer_name text,
  spend bigint,
  invoice_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    c.id,
    c.full_name,
    sum(i.total)::bigint as spend,
    count(*)::bigint as invoice_count
  from invoices i
  join customers c on c.id = i.customer_id
  where i.company_id = auth_company_id()
    and i.deleted_at is null
    and i.issued_at::date between p_from and p_to
  group by c.id, c.full_name
  order by spend desc, invoice_count desc, c.full_name
  limit greatest(1, least(coalesce(p_limit, 5), 50));
$$;

grant execute on function analytics_top_products(date, date, integer) to authenticated;
grant execute on function analytics_top_customers(date, date, integer) to authenticated;

insert into scheduled_jobs (name, type, interval_seconds)
values ('analytics_daily_metrics', 'analytics_daily_metrics', 86400)
on conflict (name) do nothing;
