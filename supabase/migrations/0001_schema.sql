-- TrustOps AI — Phase 0/1 schema
-- Non-negotiables baked in from the first migration:
--   * Multi-tenancy: every domain table has company_id (RLS added in 0002).
--   * Money is integer kobo (bigint). Never floats. CHECKs guard signs.
--   * Soft delete (deleted_at) for invoices and customers; never hard delete.
--   * Per-company sequential invoice numbers generated atomically in record_sale.

create extension if not exists pgcrypto;  -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type user_role as enum ('owner', 'manager', 'staff', 'accountant');
create type invoice_status as enum (
  'draft', 'unpaid', 'partial', 'paid', 'overdue', 'archived'
);
create type payment_method as enum ('cash', 'transfer', 'card', 'other');

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- companies
-- invoice_seq is the per-company invoice counter, incremented under a row lock
-- inside record_sale so two concurrent sales never collide on a number.
-- ---------------------------------------------------------------------------
create table companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) > 0),
  currency    text not null default 'NGN',
  invoice_seq integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger companies_updated_at
  before update on companies
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- branches
-- ---------------------------------------------------------------------------
create table branches (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  name        text not null check (length(btrim(name)) > 0),
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index branches_company_id_idx on branches(company_id);
-- At most one primary branch per company.
create unique index branches_one_primary_per_company
  on branches(company_id) where is_primary;
create trigger branches_updated_at
  before update on branches
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- profiles — one per auth user, carries company + role
-- ---------------------------------------------------------------------------
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  company_id  uuid not null references companies(id) on delete cascade,
  branch_id   uuid references branches(id) on delete set null,
  full_name   text not null check (length(btrim(full_name)) > 0),
  role        user_role not null default 'staff',
  phone       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_company_id_idx on profiles(company_id);
create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- customers (soft-deletable)
-- ---------------------------------------------------------------------------
create table customers (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  full_name   text not null check (length(btrim(full_name)) > 0),
  phone       text not null,
  email       text,
  notes       text,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index customers_company_id_idx on customers(company_id);
create index customers_phone_idx on customers(company_id, phone);
-- Phone is unique within a company (independent of soft-delete state).
create unique index customers_company_phone_unique on customers(company_id, phone);
create trigger customers_updated_at
  before update on customers
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- invoices (soft-deletable). Money columns are integer kobo (bigint).
-- ---------------------------------------------------------------------------
create table invoices (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references companies(id) on delete cascade,
  branch_id      uuid references branches(id) on delete set null,
  customer_id    uuid not null references customers(id) on delete restrict,
  invoice_number text not null,
  status         invoice_status not null default 'draft',
  subtotal       bigint not null default 0 check (subtotal >= 0),
  discount       bigint not null default 0 check (discount >= 0),
  total          bigint not null default 0 check (total >= 0),
  issued_at      timestamptz not null default now(),
  due_at         timestamptz,
  deleted_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index invoices_company_id_idx on invoices(company_id);
create index invoices_company_status_idx on invoices(company_id, status);
create index invoices_customer_idx on invoices(customer_id);
-- Invoice numbers are unique within a company.
create unique index invoices_company_number_unique
  on invoices(company_id, invoice_number);
create trigger invoices_updated_at
  before update on invoices
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- invoice_items
-- ---------------------------------------------------------------------------
create table invoice_items (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  invoice_id  uuid not null references invoices(id) on delete cascade,
  description text not null check (length(btrim(description)) > 0),
  quantity    integer not null check (quantity > 0),
  unit_price  bigint not null check (unit_price >= 0),
  line_total  bigint not null check (line_total >= 0),
  created_at  timestamptz not null default now()
);
create index invoice_items_invoice_idx on invoice_items(invoice_id);
create index invoice_items_company_idx on invoice_items(company_id);

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
create table payments (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  invoice_id  uuid not null references invoices(id) on delete cascade,
  amount      bigint not null check (amount > 0),
  method      payment_method not null,
  reference   text,
  paid_at     timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index payments_invoice_idx on payments(invoice_id);
create index payments_company_idx on payments(company_id);

-- ---------------------------------------------------------------------------
-- audit_logs — every invoice/payment state change is recorded here
-- ---------------------------------------------------------------------------
create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  actor_id    uuid,
  entity_type text not null,
  entity_id   uuid not null,
  action      text not null,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index audit_logs_company_idx on audit_logs(company_id);
create index audit_logs_entity_idx on audit_logs(company_id, entity_type, entity_id);
