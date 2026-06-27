-- TrustOps AI — mini storefront / shareable WhatsApp catalog
-- =============================================================================
-- A company can publish a no-login catalog of its sellable products behind an
-- unguessable token and share the link (e.g. on WhatsApp status). Customers tap
-- "Order on WhatsApp" to message the business. Same safe, tokenized pattern as
-- the public invoice page: get_public_catalog returns ONLY a fixed projection of
-- one enabled company's active, priced products. Idempotent migration.
-- =============================================================================

alter table companies add column if not exists storefront_token   text;
alter table companies add column if not exists storefront_enabled boolean not null default false;
alter table companies add column if not exists storefront_whatsapp text;

create unique index if not exists companies_storefront_token_idx
  on companies(storefront_token) where storefront_token is not null;

-- ===========================================================================
-- set_storefront — owner/manager enables the catalog + sets the order number.
-- Generates a stable token on first enable. Returns the link details.
-- ===========================================================================
create or replace function set_storefront(p_enabled boolean, p_whatsapp text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_company uuid := auth_company_id();
  v_role    user_role;
  v_token   text;
  v_phone   text;
begin
  if v_uid is null or v_company is null then
    raise exception 'Not authenticated';
  end if;
  select role into v_role from profiles where id = v_uid;
  if v_role not in ('owner', 'manager') then
    raise exception 'Only an owner or manager can manage the storefront';
  end if;

  select storefront_token into v_token from companies where id = v_company;
  if v_token is null then
    v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  end if;
  v_phone := nullif(btrim(p_whatsapp), '');

  update companies
     set storefront_enabled  = coalesce(p_enabled, false),
         storefront_whatsapp = v_phone,
         storefront_token    = v_token
   where id = v_company;

  insert into audit_logs (company_id, actor_id, entity_type, entity_id, action, metadata)
  values (v_company, v_uid, 'company', v_company, 'storefront.updated',
          jsonb_build_object('enabled', coalesce(p_enabled, false)));

  return jsonb_build_object('token', v_token, 'enabled', coalesce(p_enabled, false), 'whatsapp', v_phone);
end;
$$;

-- ===========================================================================
-- get_public_catalog — public, by token. Only an ENABLED company's active,
-- priced products; nothing else is reachable.
-- ===========================================================================
create or replace function get_public_catalog(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company  companies%rowtype;
  v_products jsonb;
begin
  if coalesce(btrim(p_token), '') = '' then
    return null;
  end if;
  select * into v_company
    from companies
   where storefront_token = p_token and storefront_enabled = true;
  if v_company.id is null then
    return null;
  end if;

  select coalesce(
           jsonb_agg(
             jsonb_build_object('name', name, 'category', category, 'unit', unit, 'sell_price', sell_price)
             order by category nulls last, name
           ),
           '[]'::jsonb
         )
    into v_products
    from products
   where company_id = v_company.id and is_active = true and deleted_at is null and sell_price > 0;

  return jsonb_build_object(
    'company_name', v_company.name,
    'whatsapp',     v_company.storefront_whatsapp,
    'products',     v_products
  );
end;
$$;

grant execute on function set_storefront(boolean, text) to authenticated;
grant execute on function get_public_catalog(text) to anon, authenticated, service_role;
