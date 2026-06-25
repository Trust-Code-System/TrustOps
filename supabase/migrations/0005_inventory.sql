-- TrustOps AI — Phase 2: Inventory schema
-- Carry-forward non-negotiables: company_id + RLS on every table, money as
-- integer kobo, soft delete, audit on stock changes, role gating in RPCs/policies.

create type stock_movement_type as enum (
  'sale', 'restock', 'adjustment', 'transfer_in', 'transfer_out', 'return'
);

-- ---------------------------------------------------------------------------
-- products — the catalog. Prices in kobo. cost_price captured now for Phase 5
-- profit/COGS. Soft-deletable; is_active hides from sale without deleting.
-- ---------------------------------------------------------------------------
create table products (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  name        text not null check (length(btrim(name)) > 0),
  sku         text,
  category    text,
  unit        text not null default 'piece',
  cost_price  bigint not null default 0 check (cost_price >= 0),
  sell_price  bigint not null default 0 check (sell_price >= 0),
  is_active   boolean not null default true,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index products_company_idx on products(company_id);
create index products_company_active_idx on products(company_id, is_active);
-- SKU unique per company (when set, among live products).
create unique index products_company_sku_unique
  on products(company_id, sku)
  where sku is not null and deleted_at is null;
create trigger products_updated_at
  before update on products
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- inventory — running quantity cache per (branch, product). Always reconcilable
-- from the sum of stock_movements. Never goes below zero.
-- ---------------------------------------------------------------------------
create table inventory (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references companies(id) on delete cascade,
  branch_id           uuid not null references branches(id) on delete cascade,
  product_id          uuid not null references products(id) on delete cascade,
  quantity            integer not null default 0 check (quantity >= 0),
  low_stock_threshold integer not null default 0 check (low_stock_threshold >= 0),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (branch_id, product_id)
);
create index inventory_company_idx on inventory(company_id);
create index inventory_product_idx on inventory(product_id);
create index inventory_company_branch_idx on inventory(company_id, branch_id);
create trigger inventory_updated_at
  before update on inventory
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- stock_movements — the immutable ledger. Every quantity change writes one row;
-- inventory.quantity is only ever a cache of these. Append-only (no update/delete).
-- ---------------------------------------------------------------------------
create table stock_movements (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references companies(id) on delete cascade,
  branch_id      uuid not null references branches(id) on delete cascade,
  product_id     uuid not null references products(id) on delete cascade,
  type           stock_movement_type not null,
  quantity_delta integer not null check (quantity_delta <> 0),
  reason         text,
  reference      text, -- e.g. an invoice id for 'sale' movements
  actor_id       uuid,
  created_at     timestamptz not null default now()
);
create index stock_movements_company_product_idx on stock_movements(company_id, product_id);
create index stock_movements_branch_product_idx on stock_movements(branch_id, product_id);
create index stock_movements_reference_idx on stock_movements(reference);

-- ---------------------------------------------------------------------------
-- Link sale line items to products (nullable: free-text items still allowed).
-- ---------------------------------------------------------------------------
alter table invoice_items
  add column product_id uuid references products(id) on delete set null;
create index invoice_items_product_idx on invoice_items(product_id);

-- ---------------------------------------------------------------------------
-- RLS — read within company; ALL writes go through SECURITY DEFINER RPCs
-- (create_product, update_product, adjust_stock, transfer_stock, record_sale),
-- so no client write policies exist. Stock can't be fabricated directly.
-- ---------------------------------------------------------------------------
alter table products        enable row level security;
alter table inventory       enable row level security;
alter table stock_movements enable row level security;

create policy products_select on products
  for select using (company_id = auth_company_id());
create policy inventory_select on inventory
  for select using (company_id = auth_company_id());
create policy stock_movements_select on stock_movements
  for select using (company_id = auth_company_id());

grant select on products, inventory, stock_movements to authenticated;
