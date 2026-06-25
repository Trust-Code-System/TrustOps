-- TEST-ONLY shim. Recreates the small slice of the Supabase platform that the
-- migrations depend on but that a plain Postgres instance does not provide:
--   * the `auth` schema + a minimal `auth.users` table (FK target for profiles)
--   * `auth.uid()` reading the request JWT claim (same contract as Supabase)
--   * the `authenticated` / `anon` roles
-- This file is NEVER applied to a real database — Supabase already provides all
-- of the above. It exists only so the RLS isolation test can run locally.

-- Clean slate so the harness is idempotent.
drop schema if exists public cascade;
create schema public;
drop schema if exists auth cascade;
create schema auth;

create extension if not exists pgcrypto;

-- Roles Supabase provides. NOLOGIN; RLS applies to authenticated/anon (they are
-- not table owners). service_role bypasses RLS and runs background work.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;

grant usage on schema auth to authenticated, anon, service_role;

-- Minimal auth.users — only what the FK from profiles needs.
create table auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text unique
);

-- Same contract as Supabase: read the 'sub' claim from request.jwt.claims.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select case
    when coalesce(current_setting('request.jwt.claims', true), '') = '' then null
    else (current_setting('request.jwt.claims', true)::json ->> 'sub')::uuid
  end;
$$;

grant execute on function auth.uid() to authenticated, anon;
