-- TrustOps AI — Phase 3: Online payments (pay-by-link + gateway reconciliation)
-- =============================================================================
-- Builds the seam stubbed in `modules/payments/index.ts`. Manual/offline payments
-- still flow through record_payment (Phase 1). This adds ONLINE charges:
--   1. A company creates a `payment_intent` for an invoice (pay-by-link).
--   2. The app sends the customer to the gateway's hosted page.
--   3. The gateway calls our webhook; `reconcile_gateway_payment` (service-role)
--      records the payment via the SAME status math as record_payment, marks the
--      intent paid, and audits — idempotently. The Phase-4 engine then delivers
--      the receipt.
--
-- Money stays integer kobo. Gateway API keys live in env (like messaging), never
-- in the DB. Writes are RPC-only; the table is select-only under RLS.
-- =============================================================================

-- Idempotent: this migration is safe to re-run (create-if-not-exists + replace).
create table if not exists payment_intents (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references companies(id) on delete cascade,
  invoice_id         uuid not null references invoices(id) on delete cascade,
  provider           text not null default 'simulated'
                       check (provider in ('paystack', 'monnify', 'simulated')),
  reference          text not null,                 -- our reference, sent to the gateway
  provider_reference text,                          -- the gateway's own reference
  amount             bigint not null check (amount > 0),  -- kobo, = invoice balance at creation
  status             text not null default 'pending'
                       check (status in ('pending', 'success', 'failed', 'expired')),
  authorization_url  text,                          -- gateway hosted-checkout URL
  public_token       text not null,                 -- opaque token for the pay-by-link
  customer_email     text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  paid_at            timestamptz,
  unique (company_id, reference)
);
create unique index if not exists payment_intents_reference_idx on payment_intents(reference);
create unique index if not exists payment_intents_public_token_idx on payment_intents(public_token);
create index if not exists payment_intents_invoice_idx on payment_intents(invoice_id);
create index if not exists payment_intents_company_idx on payment_intents(company_id);

drop trigger if exists payment_intents_updated_at on payment_intents;
create trigger payment_intents_updated_at
  before update on payment_intents
  for each row execute function set_updated_at();

-- RLS: tenants may READ their own intents; all writes go through the RPCs below.
alter table payment_intents enable row level security;

drop policy if exists payment_intents_select on payment_intents;
create policy payment_intents_select on payment_intents
  for select using (company_id = auth_company_id());

-- ===========================================================================
-- create_payment_intent — a company starts an online charge for one invoice.
-- Computes the outstanding balance server-side; refuses settled invoices.
-- Payload: { "invoice_id": uuid, "provider": text|null }
-- ===========================================================================
create or replace function create_payment_intent(p_payload jsonb)
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
  v_provider  text;
  v_total     bigint;
  v_paid      bigint;
  v_balance   bigint;
  v_email     text;
  v_reference text;
  v_token     text;
  v_intent    uuid;
begin
  if v_uid is null or v_company is null then
    raise exception 'Not authenticated';
  end if;

  select role, is_active into v_role, v_active from profiles where id = v_uid;
  if not coalesce(v_active, false) then
    raise exception 'Your account is not active';
  end if;
  if v_role not in ('owner', 'manager', 'staff', 'accountant') then
    raise exception 'Your role cannot request payments';
  end if;

  v_invoice  := (p_payload->>'invoice_id')::uuid;
  v_provider := coalesce(nullif(p_payload->>'provider', ''), 'simulated');
  if v_provider not in ('paystack', 'monnify', 'simulated') then
    raise exception 'Unknown payment provider';
  end if;

  -- Lock the invoice; enforce tenancy + that it is live.
  select total into v_total
    from invoices
   where id = v_invoice and company_id = v_company and deleted_at is null
   for update;
  if v_total is null then
    raise exception 'Invoice not found in your company';
  end if;

  select coalesce(sum(amount), 0) into v_paid
    from payments where invoice_id = v_invoice;
  v_balance := v_total - v_paid;
  if v_balance <= 0 then
    raise exception 'This invoice is already settled';
  end if;

  select c.email into v_email
    from invoices i join customers c on c.id = i.customer_id
   where i.id = v_invoice;

  v_reference := 'PI_' || replace(gen_random_uuid()::text, '-', '');
  v_token     := replace(gen_random_uuid()::text, '-', '')
              || replace(gen_random_uuid()::text, '-', '');

  insert into payment_intents
    (company_id, invoice_id, provider, reference, amount, public_token, customer_email)
  values
    (v_company, v_invoice, v_provider, v_reference, v_balance, v_token, v_email)
  returning id into v_intent;

  insert into audit_logs (company_id, actor_id, entity_type, entity_id, action, metadata)
  values (v_company, v_uid, 'payment_intent', v_intent, 'payment_intent.created',
          jsonb_build_object('invoice_id', v_invoice, 'amount', v_balance, 'provider', v_provider));

  return (select to_jsonb(pi) from payment_intents pi where pi.id = v_intent);
end;
$$;

-- ===========================================================================
-- update_payment_intent_link — persist the gateway's hosted-checkout URL +
-- reference after the app initialises the charge. Company-scoped.
-- Payload: { "reference", "authorization_url", "provider_reference", "provider" }
-- ===========================================================================
create or replace function update_payment_intent_link(p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company uuid := auth_company_id();
begin
  if v_company is null then
    raise exception 'Not authenticated';
  end if;

  update payment_intents
     set authorization_url  = nullif(p_payload->>'authorization_url', ''),
         provider_reference = nullif(p_payload->>'provider_reference', ''),
         provider           = coalesce(nullif(p_payload->>'provider', ''), provider)
   where reference = (p_payload->>'reference')
     and company_id = v_company
     and status = 'pending';
end;
$$;

-- ===========================================================================
-- reconcile_gateway_payment — SERVICE-ROLE ONLY. Called by the gateway webhook.
-- Idempotent on the intent: a repeated 'success' is a no-op. On success it
-- records the payment (same status math as record_payment) and marks the intent.
-- Payload: { "reference", "provider_reference", "amount", "status", "method" }
-- ===========================================================================
create or replace function reconcile_gateway_payment(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_intent    payment_intents%rowtype;
  v_amount    bigint;
  v_method    payment_method;
  v_status    text;
  v_total     bigint;
  v_paid      bigint;
  v_inv_status invoice_status;
  v_payment   uuid;
begin
  -- Lock the intent by our reference (cross-tenant: service role bypasses RLS).
  select * into v_intent
    from payment_intents
   where reference = (p_payload->>'reference')
   for update;
  if v_intent.id is null then
    raise exception 'Payment intent not found';
  end if;

  -- Idempotency: already reconciled → return without double-recording.
  if v_intent.status = 'success' then
    return jsonb_build_object('already_reconciled', true, 'invoice_id', v_intent.invoice_id);
  end if;

  v_status := coalesce(p_payload->>'status', 'failed');
  if v_status <> 'success' then
    update payment_intents set status = 'failed' where id = v_intent.id;
    return jsonb_build_object('reconciled', false, 'status', v_status);
  end if;

  v_amount := coalesce((p_payload->>'amount')::bigint, v_intent.amount);
  if v_amount <= 0 then
    raise exception 'Reconciled amount must be greater than zero';
  end if;
  v_method := coalesce(nullif(p_payload->>'method', ''), 'transfer')::payment_method;

  -- Record the payment against the invoice (mirrors record_payment math).
  insert into payments (company_id, invoice_id, amount, method, reference)
  values (v_intent.company_id, v_intent.invoice_id, v_amount, v_method,
          coalesce(nullif(p_payload->>'provider_reference', ''), v_intent.reference))
  returning id into v_payment;

  select total into v_total from invoices where id = v_intent.invoice_id for update;
  select coalesce(sum(amount), 0) into v_paid
    from payments where invoice_id = v_intent.invoice_id;
  if v_paid >= v_total then
    v_inv_status := 'paid';
  elsif v_paid > 0 then
    v_inv_status := 'partial';
  else
    v_inv_status := 'unpaid';
  end if;
  update invoices set status = v_inv_status where id = v_intent.invoice_id;

  update payment_intents
     set status = 'success',
         provider_reference = coalesce(nullif(p_payload->>'provider_reference', ''), provider_reference),
         paid_at = now()
   where id = v_intent.id;

  insert into audit_logs (company_id, actor_id, entity_type, entity_id, action, metadata)
  values (v_intent.company_id, null, 'payment', v_payment, 'payment.reconciled',
          jsonb_build_object('invoice_id', v_intent.invoice_id, 'amount', v_amount,
                             'provider', v_intent.provider, 'status', v_inv_status));

  return jsonb_build_object(
    'reconciled', true,
    'invoice_id', v_intent.invoice_id,
    'company_id', v_intent.company_id,
    'invoice_status', v_inv_status
  );
end;
$$;

-- Grants: company-facing RPCs → authenticated (tenancy enforced inside);
-- reconciliation → service_role only (the webhook connects with that key).
revoke execute on function reconcile_gateway_payment(jsonb) from public;
grant execute on function create_payment_intent(jsonb) to authenticated;
grant execute on function update_payment_intent_link(jsonb) to authenticated;
grant execute on function reconcile_gateway_payment(jsonb) to service_role;
