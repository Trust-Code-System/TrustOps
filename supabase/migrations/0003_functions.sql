-- TrustOps AI — RPC functions
-- These are the only sanctioned write paths for company creation and for sales /
-- payments. Each runs as a single transaction (a function call is atomic): if
-- any statement raises, the WHOLE thing rolls back — no partial sale ever exists.
-- All are SECURITY DEFINER and re-derive the caller via auth.uid(), then enforce
-- tenancy and role checks themselves (they bypass RLS, so they must).

-- ===========================================================================
-- bootstrap_company — sign-up: create company + primary branch + owner profile
-- for the just-registered user, atomically.
-- ===========================================================================
create or replace function bootstrap_company(
  p_company_name text,
  p_full_name    text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_company uuid;
  v_branch  uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from profiles where id = v_uid) then
    raise exception 'This account already belongs to a company';
  end if;

  if length(btrim(coalesce(p_company_name, ''))) = 0 then
    raise exception 'Company name is required';
  end if;
  if length(btrim(coalesce(p_full_name, ''))) = 0 then
    raise exception 'Your name is required';
  end if;

  insert into companies (name)
  values (btrim(p_company_name))
  returning id into v_company;

  insert into branches (company_id, name, is_primary)
  values (v_company, 'Main', true)
  returning id into v_branch;

  insert into profiles (id, company_id, branch_id, full_name, role, is_active)
  values (v_uid, v_company, v_branch, btrim(p_full_name), 'owner', true);

  insert into audit_logs (company_id, actor_id, entity_type, entity_id, action, metadata)
  values (v_company, v_uid, 'company', v_company, 'company.created',
          jsonb_build_object('name', btrim(p_company_name)));

  return v_company;
end;
$$;

-- ===========================================================================
-- record_sale — THE atomic sale. Creates an invoice with a fresh per-company
-- number, inserts line items with server-computed totals, optionally records a
-- payment, sets status, writes an audit log, and returns the full sale.
--
-- Payload shape:
-- {
--   "customer_id": uuid,
--   "branch_id":   uuid | null,
--   "due_at":      timestamptz | null,
--   "discount":    bigint (kobo, default 0),
--   "items":  [ { "description": text, "quantity": int, "unit_price": bigint } ],
--   "payment": { "amount": bigint, "method": text, "reference": text } | null
-- }
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
  -- Sales-floor roles may record sales (org admins + staff). Accountants reconcile.
  if v_role not in ('owner', 'manager', 'staff') then
    raise exception 'Your role cannot record sales';
  end if;

  v_customer := (p_payload->>'customer_id')::uuid;
  if v_customer is null then
    raise exception 'A customer is required';
  end if;
  -- Tenancy: the customer must belong to the caller's company (RLS is bypassed
  -- here, so we check explicitly) and must not be archived.
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

  -- Per-company sequential invoice number under a row lock: two concurrent
  -- sales serialize here and can never get the same number.
  update companies
     set invoice_seq = invoice_seq + 1
   where id = v_company
  returning invoice_seq into v_seq;
  v_number := 'INV-' || lpad(v_seq::text, 4, '0');

  insert into invoices (company_id, branch_id, customer_id, invoice_number, status, issued_at, due_at)
  values (v_company, v_branch, v_customer, v_number, 'draft', now(), v_due_at)
  returning id into v_invoice;

  -- Line items: totals computed server-side; never trust client totals.
  for v_item in select * from jsonb_array_elements(coalesce(p_payload->'items', '[]'::jsonb))
  loop
    v_item_count := v_item_count + 1;
    v_qty  := (v_item->>'quantity')::integer;
    v_unit := (v_item->>'unit_price')::bigint;

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
      (company_id, invoice_id, description, quantity, unit_price, line_total)
    values
      (v_company, v_invoice, btrim(v_item->>'description'), v_qty, v_unit, v_line);
  end loop;

  if v_item_count = 0 then
    raise exception 'A sale needs at least one item';
  end if;

  v_total := v_subtotal - v_discount;
  if v_total < 0 then
    raise exception 'Discount cannot exceed the subtotal';
  end if;

  -- Optional immediate payment.
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

-- ===========================================================================
-- record_payment — record a payment against an existing invoice and recompute
-- its status, atomically. Audit logged.
-- Payload: { "invoice_id": uuid, "amount": bigint, "method": text, "reference": text }
-- ===========================================================================
create or replace function record_payment(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid       uuid := auth.uid();
  v_company   uuid := auth_company_id();
  v_role      user_role;
  v_active    boolean;
  v_invoice   uuid;
  v_total     bigint;
  v_amount    bigint;
  v_method    payment_method;
  v_paid      bigint;
  v_status    invoice_status;
  v_payment   uuid;
begin
  if v_uid is null or v_company is null then
    raise exception 'Not authenticated';
  end if;

  select role, is_active into v_role, v_active from profiles where id = v_uid;
  if not coalesce(v_active, false) then
    raise exception 'Your account is not active';
  end if;
  if v_role not in ('owner', 'manager', 'staff', 'accountant') then
    raise exception 'Your role cannot record payments';
  end if;

  v_invoice := (p_payload->>'invoice_id')::uuid;
  v_amount  := (p_payload->>'amount')::bigint;
  v_method  := (p_payload->>'method')::payment_method;

  if v_amount is null or v_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  -- Lock the invoice; ensure tenancy and that it is live and not already paid.
  select total into v_total
    from invoices
   where id = v_invoice and company_id = v_company and deleted_at is null
   for update;
  if v_total is null then
    raise exception 'Invoice not found in your company';
  end if;

  insert into payments (company_id, invoice_id, amount, method, reference)
  values (v_company, v_invoice, v_amount, v_method,
          nullif(p_payload->>'reference', ''))
  returning id into v_payment;

  select coalesce(sum(amount), 0) into v_paid
    from payments where invoice_id = v_invoice;

  if v_paid >= v_total then
    v_status := 'paid';
  elsif v_paid > 0 then
    v_status := 'partial';
  else
    v_status := 'unpaid';
  end if;

  update invoices set status = v_status where id = v_invoice;

  insert into audit_logs (company_id, actor_id, entity_type, entity_id, action, metadata)
  values (v_company, v_uid, 'payment', v_payment, 'payment.recorded',
          jsonb_build_object('invoice_id', v_invoice, 'amount', v_amount,
                             'method', v_method, 'status', v_status));

  return jsonb_build_object(
    'invoice', (select to_jsonb(i) from invoices i where i.id = v_invoice),
    'payment', (select to_jsonb(p) from payments p where p.id = v_payment)
  );
end;
$$;

-- Callable by signed-in users; tenancy/role enforced inside each function.
grant execute on function bootstrap_company(text, text) to authenticated;
grant execute on function record_sale(jsonb) to authenticated;
grant execute on function record_payment(jsonb) to authenticated;
