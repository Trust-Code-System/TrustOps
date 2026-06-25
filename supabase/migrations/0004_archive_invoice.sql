-- archive_invoice — soft-delete an invoice with an audit trail.
-- Archiving is a state change, so it goes through a SECURITY DEFINER RPC (which
-- can write audit_logs) rather than a direct client UPDATE. Org admins only.
create or replace function archive_invoice(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_company uuid := auth_company_id();
  v_role    user_role;
  v_number  text;
begin
  if v_uid is null or v_company is null then
    raise exception 'Not authenticated';
  end if;

  select role into v_role from profiles where id = v_uid;
  if v_role not in ('owner', 'manager') then
    raise exception 'Only an owner or manager can archive invoices';
  end if;

  update invoices
     set deleted_at = now(), status = 'archived'
   where id = p_invoice_id and company_id = v_company and deleted_at is null
  returning invoice_number into v_number;

  if v_number is null then
    raise exception 'Invoice not found in your company';
  end if;

  insert into audit_logs (company_id, actor_id, entity_type, entity_id, action, metadata)
  values (v_company, v_uid, 'invoice', p_invoice_id, 'invoice.archived',
          jsonb_build_object('invoice_number', v_number));
end;
$$;

grant execute on function archive_invoice(uuid) to authenticated;
