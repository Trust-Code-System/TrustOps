-- TrustOps AI — Phase: offline sale idempotency
-- =============================================================================
-- Enables safe offline sale capture (PWA). A sale recorded on a phone while
-- offline is replayed when connectivity returns; a flaky network can replay the
-- SAME sale more than once. A client-generated `client_uuid` makes record_sale
-- idempotent: the first call creates the invoice, any replay returns the SAME
-- invoice instead of creating a duplicate.
--
-- Idempotent migration (safe to re-run). Rebuilds record_sale on top of the
-- Phase-2 (inventory) version, preserving atomic stock decrement.
-- =============================================================================

alter table invoices add column if not exists client_uuid uuid;

-- One invoice per (company, client_uuid). Partial: only constrains offline sales.
create unique index if not exists invoices_company_client_uuid_idx
  on invoices(company_id, client_uuid)
  where client_uuid is not null;

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
  v_client      uuid;
  v_existing    uuid;
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

  -- Idempotency: a replayed offline sale returns the original invoice, no dup.
  v_client := nullif(p_payload->>'client_uuid', '')::uuid;
  if v_client is not null then
    select id into v_existing
      from invoices where company_id = v_company and client_uuid = v_client;
    if v_existing is not null then
      return jsonb_build_object(
        'invoice', (select to_jsonb(i) from invoices i where i.id = v_existing),
        'items',   coalesce((select jsonb_agg(to_jsonb(it) order by it.created_at)
                             from invoice_items it where it.invoice_id = v_existing), '[]'::jsonb),
        'payment', (select to_jsonb(p) from payments p where p.invoice_id = v_existing
                     order by p.created_at limit 1),
        'idempotent_replay', true
      );
    end if;
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

  insert into invoices (company_id, branch_id, customer_id, invoice_number, status, issued_at, due_at, client_uuid)
  values (v_company, v_branch, v_customer, v_number, 'draft', now(), v_due_at, v_client)
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
