-- TrustOps AI — fix: low-stock alert dedupe ON CONFLICT predicate
--
-- jobs.dedupe_key is backed by a PARTIAL unique index
-- (`jobs_dedupe_unique ... where dedupe_key is not null`, migration 0007).
-- Postgres cannot infer a partial index as the ON CONFLICT arbiter unless the
-- index predicate is restated. enqueue_job (0008) already does this; the
-- enqueue_low_stock_alert() trigger from 0007 was missed, so it raised
-- "no unique or exclusion constraint matching the ON CONFLICT specification"
-- whenever a sale dropped stock to/below its threshold and fired the trigger.
--
-- Idempotent redefinition: add `where dedupe_key is not null` to match the
-- partial index. Behaviour is otherwise identical to 0007.
create or replace function enqueue_low_stock_alert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.low_stock_threshold > 0
     and new.quantity <= new.low_stock_threshold
     and new.quantity < old.quantity then
    insert into jobs (company_id, type, payload, dedupe_key)
    values (
      new.company_id,
      'stock_alert',
      jsonb_build_object(
        'product_id', new.product_id,
        'branch_id', new.branch_id,
        'quantity', new.quantity,
        'threshold', new.low_stock_threshold
      ),
      'stock_alert:' || new.product_id || ':' || new.branch_id || ':' ||
        to_char(now(), 'YYYY-MM-DD')
    )
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
  end if;
  return new;
end;
$$;
