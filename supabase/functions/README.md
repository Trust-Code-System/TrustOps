# Postgres RPC functions

The canonical SQL for the RPCs — `bootstrap_company`, `record_sale`, and
`record_payment` — lives in [`../migrations/0003_functions.sql`](../migrations/0003_functions.sql).

They are kept in the migrations directory (rather than here) so they are applied
in order as part of `supabase db reset` / the RLS test harness, and so schema
and functions stay versioned together. This folder is the seam the brief calls
out; treat the migration file as the source of truth.

- `record_sale(jsonb)` — the atomic sale (invoice + items + optional payment +
  audit), all-or-nothing in one transaction.
- `record_payment(jsonb)` — record a payment against an invoice and recompute
  status, atomically.
- `bootstrap_company(text, text)` — create company + primary branch + owner
  profile for a new user at sign-up.
