-- TrustOps AI — Phase 2: Inventory RPCs + record_sale stock integration
-- All SECURITY DEFINER; they re-derive the caller, enforce tenancy + role, and
-- are the only write paths for products/inventory/stock_movements. Every stock
-- change writes a movement row and (for state changes) an audit log. Atomic.

-- ===========================================================================
-- create_product — create a product and optional initial stock per branch.
-- Payload: { name, sku?, category?, unit?, cost_price?, sell_price?,
--            initial_stock?: [{ branch_id, quantity, low_stock_threshold? }] }
-- ===========================================================================
create or replace function create_product(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_company uuid := auth_company_id();
  v_role    user_role;
  v_product uuid;
  v_stock   jsonb;
  v_branch  uuid;
  v_qty     integer;
  v_thr     integer;
begin
  if v_uid is null or v_company is null then
    raise exception 'Not authenticated';
  end if;
  select role into v_role from profiles where id = v_uid;
  if v_role not in ('owner', 'manager') then
    raise exception 'Only an owner or manager can manage products';
  end if;
  if length(btrim(coalesce(p_payload->>'name', ''))) = 0 then
    raise exception 'Product name is required';
  end if;

  insert into products (company_id, name, sku, category, unit, cost_price, sell_price)
  values (
    v_company,
    btrim(p_payload->>'name'),
    nullif(btrim(coalesce(p_payload->>'sku', '')), ''),
    nullif(btrim(coalesce(p_payload->>'category', '')), ''),
    coalesce(nullif(btrim(coalesce(p_payload->>'unit', '')), ''), 'piece'),
    coalesce((p_payload->>'cost_price')::bigint, 0),
    coalesce((p_payload->>'sell_price')::bigint, 0)
  )
  returning id into v_product;

  for v_stock in
    select * from jsonb_array_elements(coalesce(p_payload->'initial_stock', '[]'::jsonb))
  loop
    v_branch := (v_stock->>'branch_id')::uuid;
    v_qty := coalesce((v_stock->>'quantity')::integer, 0);
    v_thr := coalesce((v_stock->>'low_stock_threshold')::integer, 0);
    if not exists (select 1 from branches where id = v_branch and company_id = v_company) then
      raise exception 'Branch not found in your company';
    end if;
    if v_qty < 0 then
      raise exception 'Initial stock cannot be negative';
    end if;

    insert into inventory (company_id, branch_id, product_id, quantity, low_stock_threshold)
    values (v_company, v_branch, v_product, v_qty, v_thr)
    on conflict (branch_id, product_id)
      do update set quantity = excluded.quantity,
                    low_stock_threshold = excluded.low_stock_threshold;

    if v_qty > 0 then
      insert into stock_movements
        (company_id, branch_id, product_id, type, quantity_delta, reason, actor_id)
      values (v_company, v_branch, v_product, 'restock', v_qty, 'Initial stock', v_uid);
    end if;
  end loop;

  insert into audit_logs (company_id, actor_id, entity_type, entity_id, action, metadata)
  values (v_company, v_uid, 'product', v_product, 'product.created',
          jsonb_build_object('name', btrim(p_payload->>'name')));

  return (select to_jsonb(p) from products p where p.id = v_product);
end;
$$;

-- ===========================================================================
-- update_product — edit catalog fields / deactivate. Does not touch stock.
-- Payload: { id, name, sku?, category?, unit?, cost_price?, sell_price?, is_active? }
-- ===========================================================================
create or replace function update_product(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_company uuid := auth_company_id();
  v_role    user_role;
  v_product uuid := (p_payload->>'id')::uuid;
begin
  if v_uid is null or v_company is null then
    raise exception 'Not authenticated';
  end if;
  select role into v_role from profiles where id = v_uid;
  if v_role not in ('owner', 'manager') then
    raise exception 'Only an owner or manager can manage products';
  end if;
  if length(btrim(coalesce(p_payload->>'name', ''))) = 0 then
    raise exception 'Product name is required';
  end if;

  update products set
    name       = btrim(p_payload->>'name'),
    sku        = nullif(btrim(coalesce(p_payload->>'sku', '')), ''),
    category   = nullif(btrim(coalesce(p_payload->>'category', '')), ''),
    unit       = coalesce(nullif(btrim(coalesce(p_payload->>'unit', '')), ''), 'piece'),
    cost_price = coalesce((p_payload->>'cost_price')::bigint, cost_price),
    sell_price = coalesce((p_payload->>'sell_price')::bigint, sell_price),
    is_active  = coalesce((p_payload->>'is_active')::boolean, is_active)
  where id = v_product and company_id = v_company and deleted_at is null;

  if not found then
    raise exception 'Product not found in your company';
  end if;

  insert into audit_logs (company_id, actor_id, entity_type, entity_id, action, metadata)
  values (v_company, v_uid, 'product', v_product, 'product.updated', '{}'::jsonb);

  return (select to_jsonb(p) from products p where p.id = v_product);
end;
$$;

-- ===========================================================================
-- adjust_stock — manual restock / adjustment / return + optional threshold set.
-- Writes a movement and updates the quantity cache, under a row lock. Reason
-- required. Org admins only.
-- Payload: { product_id, branch_id, type, quantity_delta, reason, low_stock_threshold? }
-- ===========================================================================
create or replace function adjust_stock(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_company uuid := auth_company_id();
  v_role    user_role;
  v_product uuid := (p_payload->>'product_id')::uuid;
  v_branch  uuid := (p_payload->>'branch_id')::uuid;
  v_type    stock_movement_type := (p_payload->>'type')::stock_movement_type;
  v_delta   integer := (p_payload->>'quantity_delta')::integer;
  v_reason  text := nullif(btrim(coalesce(p_payload->>'reason', '')), '');
  v_thr     integer := nullif(p_payload->>'low_stock_threshold', '')::integer;
  v_current integer;
  v_new     integer;
begin
  if v_uid is null or v_company is null then
    raise exception 'Not authenticated';
  end if;
  select role into v_role from profiles where id = v_uid;
  if v_role not in ('owner', 'manager') then
    raise exception 'Only an owner or manager can adjust stock';
  end if;
  if v_type not in ('restock', 'adjustment', 'return') then
    raise exception 'Invalid adjustment type';
  end if;
  if v_delta is null or v_delta = 0 then
    raise exception 'Enter a non-zero quantity';
  end if;
  if v_reason is null then
    raise exception 'A reason is required';
  end if;
  if not exists (select 1 from products where id = v_product and company_id = v_company and deleted_at is null) then
    raise exception 'Product not found in your company';
  end if;
  if not exists (select 1 from branches where id = v_branch and company_id = v_company) then
    raise exception 'Branch not found in your company';
  end if;

  -- Lock (or create) the inventory row for this branch+product.
  select quantity into v_current
    from inventory
   where branch_id = v_branch and product_id = v_product
   for update;
  if v_current is null then
    insert into inventory (company_id, branch_id, product_id, quantity, low_stock_threshold)
    values (v_company, v_branch, v_product, 0, coalesce(v_thr, 0));
    v_current := 0;
  end if;

  v_new := v_current + v_delta;
  if v_new < 0 then
    raise exception 'Stock cannot go below zero (have %, change %)', v_current, v_delta;
  end if;

  update inventory
     set quantity = v_new,
         low_stock_threshold = coalesce(v_thr, low_stock_threshold)
   where branch_id = v_branch and product_id = v_product;

  insert into stock_movements
    (company_id, branch_id, product_id, type, quantity_delta, reason, actor_id)
  values (v_company, v_branch, v_product, v_type, v_delta, v_reason, v_uid);

  insert into audit_logs (company_id, actor_id, entity_type, entity_id, action, metadata)
  values (v_company, v_uid, 'inventory', v_product, 'stock.adjusted',
          jsonb_build_object('branch_id', v_branch, 'type', v_type,
                             'delta', v_delta, 'reason', v_reason));

  return (select to_jsonb(i) from inventory i
          where i.branch_id = v_branch and i.product_id = v_product);
end;
$$;

-- ===========================================================================
-- transfer_stock — move quantity between branches atomically. Conserves total
-- (transfer_out + transfer_in). Org admins only.
-- Payload: { product_id, from_branch_id, to_branch_id, quantity, reason? }
-- ===========================================================================
create or replace function transfer_stock(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_company uuid := auth_company_id();
  v_role    user_role;
  v_product uuid := (p_payload->>'product_id')::uuid;
  v_from    uuid := (p_payload->>'from_branch_id')::uuid;
  v_to      uuid := (p_payload->>'to_branch_id')::uuid;
  v_qty     integer := (p_payload->>'quantity')::integer;
  v_reason  text := nullif(btrim(coalesce(p_payload->>'reason', '')), '');
  v_name    text;
  v_have    integer;
begin
  if v_uid is null or v_company is null then
    raise exception 'Not authenticated';
  end if;
  select role into v_role from profiles where id = v_uid;
  if v_role not in ('owner', 'manager') then
    raise exception 'Only an owner or manager can transfer stock';
  end if;
  if v_qty is null or v_qty <= 0 then
    raise exception 'Transfer quantity must be greater than zero';
  end if;
  if v_from = v_to then
    raise exception 'Choose two different branches';
  end if;
  select name into v_name from products
   where id = v_product and company_id = v_company and deleted_at is null;
  if v_name is null then
    raise exception 'Product not found in your company';
  end if;
  if not exists (select 1 from branches where id = v_from and company_id = v_company)
     or not exists (select 1 from branches where id = v_to and company_id = v_company) then
    raise exception 'Branch not found in your company';
  end if;

  -- Lock both rows deterministically (by branch_id) to avoid deadlocks.
  perform 1 from inventory
   where product_id = v_product and branch_id in (v_from, v_to)
   order by branch_id
   for update;

  select quantity into v_have
    from inventory where branch_id = v_from and product_id = v_product;
  if coalesce(v_have, 0) < v_qty then
    raise exception 'Only % of % at the source branch', coalesce(v_have, 0), v_name;
  end if;

  update inventory set quantity = quantity - v_qty
   where branch_id = v_from and product_id = v_product;

  insert into inventory (company_id, branch_id, product_id, quantity)
  values (v_company, v_to, v_product, v_qty)
  on conflict (branch_id, product_id)
    do update set quantity = inventory.quantity + v_qty;

  insert into stock_movements (company_id, branch_id, product_id, type, quantity_delta, reason, actor_id)
  values (v_company, v_from, v_product, 'transfer_out', -v_qty, v_reason, v_uid),
         (v_company, v_to,   v_product, 'transfer_in',   v_qty, v_reason, v_uid);

  insert into audit_logs (company_id, actor_id, entity_type, entity_id, action, metadata)
  values (v_company, v_uid, 'inventory', v_product, 'stock.transferred',
          jsonb_build_object('from', v_from, 'to', v_to, 'quantity', v_qty));

  return jsonb_build_object(
    'from', (select to_jsonb(i) from inventory i where i.branch_id = v_from and i.product_id = v_product),
    'to',   (select to_jsonb(i) from inventory i where i.branch_id = v_to and i.product_id = v_product)
  );
end;
$$;

grant execute on function create_product(jsonb) to authenticated;
grant execute on function update_product(jsonb) to authenticated;
grant execute on function adjust_stock(jsonb) to authenticated;
grant execute on function transfer_stock(jsonb) to authenticated;

-- ===========================================================================
-- record_sale (REPLACED) — now also decrements stock for product-linked line
-- items, atomically, within the same sale transaction. Free-text items (no
-- product_id) still work. Insufficient stock fails the whole sale.
-- ===========================================================================
create or replace function record_sale(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid         uuid := auth.uid();
  v_company     uuid := auth_company_id();
  v_role        user_role;
  v_active      boolean;
  v_customer    uuid;
  v_branch      uuid;
  v_due_at      timestamptz;
  v_discount    bigint;
  v_seq         integer;
  v_number      text;
  v_invoice     uuid;
  v_subtotal    bigint := 0;
  v_total       bigint;
  v_item        jsonb;
  v_qty         integer;
  v_unit        bigint;
  v_line        bigint;
  v_item_count  integer := 0;
  v_product     uuid;
  v_prod_name   text;
  v_have        integer;
  v_pay         jsonb;
  v_pay_amount  bigint;
  v_pay_method  payment_method;
  v_payment     uuid;
  v_status      invoice_status;
begin
  if v_uid is null or v_company is null then
    raise exception 'Not authenticated';
  end if;

  select role, is_active into v_role, v_active from profiles where id = v_uid;
  if not coalesce(v_active, false) then
    raise exception 'Your account is not active';
  end if;
  if v_role not in ('owner', 'manager', 'staff') then
    raise exception 'Your role cannot record sales';
  end if;

  v_customer := (p_payload->>'customer_id')::uuid;
  if v_customer is null then
    raise exception 'A customer is required';
  end if;
  if not exists (
    select 1 from customers
    where id = v_customer and company_id = v_company and deleted_at is null
  ) then
    raise exception 'Customer not found in your company';
  end if;

  v_branch := nullif(p_payload->>'branch_id', '')::uuid;
  if v_branch is not null and not exists (
    select 1 from branches where id = v_branch and company_id = v_company
  ) then
    raise exception 'Branch not found in your company';
  end if;

  v_due_at   := nullif(p_payload->>'due_at', '')::timestamptz;
  v_discount := coalesce((p_payload->>'discount')::bigint, 0);
  if v_discount < 0 then
    raise exception 'Discount cannot be negative';
  end if;

  update companies
     set invoice_seq = invoice_seq + 1
   where id = v_company
  returning invoice_seq into v_seq;
  v_number := 'INV-' || lpad(v_seq::text, 4, '0');

  insert into invoices (company_id, branch_id, customer_id, invoice_number, status, issued_at, due_at)
  values (v_company, v_branch, v_customer, v_number, 'draft', now(), v_due_at)
  returning id into v_invoice;

  for v_item in select * from jsonb_array_elements(coalesce(p_payload->'items', '[]'::jsonb))
  loop
    v_item_count := v_item_count + 1;
    v_qty  := (v_item->>'quantity')::integer;
    v_unit := (v_item->>'unit_price')::bigint;
    v_product := nullif(v_item->>'product_id', '')::uuid;

    if coalesce(length(btrim(v_item->>'description')), 0) = 0 then
      raise exception 'Each item needs a description';
    end if;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Item "%" must have a quantity greater than zero',
        v_item->>'description';
    end if;
    if v_unit is null or v_unit < 0 then
      raise exception 'Item "%" has an invalid price', v_item->>'description';
    end if;

    v_line := v_qty * v_unit;
    v_subtotal := v_subtotal + v_line;

    insert into invoice_items
      (company_id, invoice_id, product_id, description, quantity, unit_price, line_total)
    values
      (v_company, v_invoice, v_product, btrim(v_item->>'description'), v_qty, v_unit, v_line);

    -- Inventory: decrement stock for product-linked items, atomically.
    if v_product is not null then
      select name into v_prod_name from products
       where id = v_product and company_id = v_company and deleted_at is null;
      if v_prod_name is null then
        raise exception 'Product not found in your company';
      end if;
      if v_branch is null then
        raise exception 'Select a branch to sell stocked products';
      end if;

      select quantity into v_have
        from inventory
       where branch_id = v_branch and product_id = v_product
       for update;
      if coalesce(v_have, 0) < v_qty then
        raise exception 'Only % of % left', coalesce(v_have, 0), v_prod_name;
      end if;

      update inventory set quantity = quantity - v_qty
       where branch_id = v_branch and product_id = v_product;

      insert into stock_movements
        (company_id, branch_id, product_id, type, quantity_delta, reason, reference, actor_id)
      values
        (v_company, v_branch, v_product, 'sale', -v_qty, null, v_invoice::text, v_uid);
    end if;
  end loop;

  if v_item_count = 0 then
    raise exception 'A sale needs at least one item';
  end if;

  v_total := v_subtotal - v_discount;
  if v_total < 0 then
    raise exception 'Discount cannot exceed the subtotal';
  end if;

  v_pay := p_payload->'payment';
  if v_pay is not null and jsonb_typeof(v_pay) = 'object' then
    v_pay_amount := (v_pay->>'amount')::bigint;
    v_pay_method := (v_pay->>'method')::payment_method;
    if v_pay_amount is null or v_pay_amount <= 0 then
      raise exception 'Payment amount must be greater than zero';
    end if;

    insert into payments (company_id, invoice_id, amount, method, reference)
    values (v_company, v_invoice, v_pay_amount, v_pay_method,
            nullif(v_pay->>'reference', ''))
    returning id into v_payment;

    if v_pay_amount >= v_total then
      v_status := 'paid';
    else
      v_status := 'partial';
    end if;
  else
    v_status := 'unpaid';
  end if;

  update invoices
     set subtotal = v_subtotal,
         discount = v_discount,
         total    = v_total,
         status   = v_status
   where id = v_invoice;

  insert into audit_logs (company_id, actor_id, entity_type, entity_id, action, metadata)
  values (v_company, v_uid, 'invoice', v_invoice, 'sale.recorded',
          jsonb_build_object(
            'invoice_number', v_number,
            'total', v_total,
            'status', v_status,
            'paid', coalesce(v_pay_amount, 0)
          ));

  return jsonb_build_object(
    'invoice', (select to_jsonb(i) from invoices i where i.id = v_invoice),
    'items',   coalesce((select jsonb_agg(to_jsonb(it) order by it.created_at)
                         from invoice_items it where it.invoice_id = v_invoice), '[]'::jsonb),
    'payment', (select to_jsonb(p) from payments p where p.id = v_payment)
  );
end;
$$;
