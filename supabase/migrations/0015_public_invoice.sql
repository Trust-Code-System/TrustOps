-- TrustOps AI — public invoice/receipt view (no-login customer page)
-- =============================================================================
-- A customer who receives a pay-by-link must see the invoice WITHOUT a TrustOps
-- account. `get_public_invoice` is SECURITY DEFINER and returns ONLY a safe,
-- minimal projection of the single invoice behind an unguessable token (the
-- payment_intent reference or public_token). No other tenant data is reachable:
-- the function fetches exactly one invoice by token and exposes a fixed set of
-- display fields. Idempotent (create or replace).
-- =============================================================================

create or replace function get_public_invoice(p_ref text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_intent   payment_intents%rowtype;
  v_inv      invoices%rowtype;
  v_paid     bigint;
  v_company  text;
  v_customer text;
  v_items    jsonb;
begin
  if coalesce(btrim(p_ref), '') = '' then
    return null;
  end if;

  select * into v_intent
    from payment_intents
   where reference = p_ref or public_token = p_ref;
  if v_intent.id is null then
    return null;
  end if;

  select * into v_inv from invoices where id = v_intent.invoice_id;
  if v_inv.id is null then
    return null;
  end if;

  select coalesce(sum(amount), 0) into v_paid from payments where invoice_id = v_inv.id;
  select name into v_company from companies where id = v_inv.company_id;
  select full_name into v_customer from customers where id = v_inv.customer_id;
  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'description', description,
               'quantity', quantity,
               'unit_price', unit_price,
               'line_total', line_total
             ) order by created_at
           ),
           '[]'::jsonb
         )
    into v_items
    from invoice_items where invoice_id = v_inv.id;

  return jsonb_build_object(
    'reference',         v_intent.reference,
    'provider',          v_intent.provider,
    'intent_status',     v_intent.status,
    'authorization_url', v_intent.authorization_url,
    'company_name',      coalesce(v_company, 'TrustOps'),
    'customer_name',     coalesce(v_customer, 'Customer'),
    'invoice_number',    v_inv.invoice_number,
    'status',            v_inv.status,
    'subtotal',          v_inv.subtotal,
    'discount',          v_inv.discount,
    'total',             v_inv.total,
    'paid',              v_paid,
    'balance',           greatest(v_inv.total - v_paid, 0),
    'issued_at',         v_inv.issued_at,
    'items',             v_items
  );
end;
$$;

-- Public-readable by token: anyone holding the unguessable link can view it.
grant execute on function get_public_invoice(text) to anon, authenticated, service_role;
