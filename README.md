# TrustOps AI

A multi-tenant business operating system for African SMEs.
Stack: **Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Postgres, Auth, RLS)**.
Architecture: modular monolith (`/modules`, clean internal boundaries).

**Phases 0, 1, 2, 4, 5, and 6 are built** — foundation/auth/app-shell, customers
+ sales + invoicing, inventory, automation + background jobs, analytics +
expenses + reports, and the AI assistant. **Phase 3 (online payments) is
deliberately deferred.** `PROGRESS.md` is the authoritative per-phase checklist;
specs live in [`trustops-phase-0-1-brief.md`](trustops-phase-0-1-brief.md) (0–1),
[`trustops-master-build-spec.md`](trustops-master-build-spec.md) (2–6), and
[`trustops-design-system.md`](trustops-design-system.md) (the UI law).

## Non-negotiables (enforced from the first migration)

- **Multi-tenancy via RLS.** Every domain table has `company_id`; policies scope
  every read/write to the caller's company via a single helper, `auth_company_id()`.
  There is no app code path that bypasses it. Proven by an automated test.
- **The sale is one atomic transaction.** `record_sale` is a Postgres RPC:
  invoice + items + optional payment + audit log, all-or-nothing.
- **Money is integer kobo.** Stored as `bigint`, never floats; formatted to ₦
  only at display time (`lib/money.ts`).

## Getting started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a Supabase project, copy `.env.example` to `.env.local`, and fill in
   the three **required** Supabase values (dashboard → Project Settings → API):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only — sign-up bootstrap + jobs worker)
   - `NEXT_PUBLIC_SITE_URL` (e.g. `http://localhost:3000`)

   Optional, blank-safe (features degrade gracefully when unset):
   - `ANTHROPIC_API_KEY` (+ `AI_MODEL`, default `claude-opus-4-8`) — the AI
     assistant; blank ⇒ assistant disabled, no live calls.
   - `RESEND_API_KEY` / `EMAIL_FROM` and `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_ID` —
     real email/WhatsApp delivery; blank ⇒ simulated no-op sends.
3. Apply **all** migrations in `supabase/migrations` in order
   (`0001_schema` → … → `0010_ai`). Either:
   - **Supabase SQL editor** — paste the files in order and Run. The editor may
     warn "creates tables without enabling RLS" on `0001`; choose **Run and
     enable RLS** — the migrations enable RLS + policies themselves (`0002`,
     `0009`, `0010`), so this is just a redundant safety net.
   - **psql / `supabase db push`** — apply the files in filename order.
4. **Auth settings in Supabase:**
   - Disable "Confirm email" so the owner sign-up flow returns a session and can
     bootstrap the company immediately. (If left on, the user must confirm, then
     sign in to finish setup.)
   - Configure SMTP for staff invites (`inviteUserByEmail` sends the invite link
     to `/accept-invite`).
5. Run the app, and (optionally) the background-jobs worker in a second terminal:
   ```bash
   npm run dev
   npm run worker   # reminders, daily report, stock alerts, analytics + AI-insights jobs
   ```
6. Sign up — this calls the `bootstrap_company` RPC and creates your company +
   owner. You're in.

## Proving RLS isolation (the Phase 0 gate)

A two-company isolation test applies the **real** migrations to a throwaway
Postgres and asserts that Company A can never see or touch Company B's data, that
`record_sale` is atomic, and that invoice numbers stay sequential with no gaps.

```bash
# 1. Start a throwaway Postgres (Docker)
docker run -d --name trustops-pg -e POSTGRES_PASSWORD=postgres -p 55432:5432 postgres:16-alpine

# 2. Run the test
RLS_TEST_DATABASE_URL="postgres://postgres:postgres@localhost:55432/postgres" npm run test:rls

# 3. Tear down
docker rm -f trustops-pg
```

The harness (`scripts/rls-test.ts`) loads a **test-only** auth shim
(`scripts/test/auth-shim.sql`) that recreates the slice of Supabase the
migrations depend on (`auth.users`, `auth.uid()`, the `authenticated` role) —
Supabase provides these in production, so the shim never touches a real database.

## Scripts

| Command            | What it does                                  |
| ------------------ | --------------------------------------------- |
| `npm run dev`      | Start the dev server                          |
| `npm run build`    | Production build                              |
| `npm run typecheck`| `tsc --noEmit`                                |
| `npm run lint`     | ESLint (next/core-web-vitals)                 |
| `npm run test:rls` | Two-company RLS isolation + atomicity test (78 checks) |
| `npm run worker`   | Background-jobs worker (queue drain + scheduler) |

## Out of scope (clean seams left)

**Phase 3 — online payments (Paystack/Monnify) is deferred.** The `payments`
module is an interface stub (`modules/payments/index.ts`) for that future gateway
integration; the Phase 1 manual cash/transfer path is the only payment route.
Other seams: messaging runs in simulated no-op mode until keys are set; the AI
assistant is non-cached and disabled without `ANTHROPIC_API_KEY`; the selected
branch is persisted client-side pending fully branch-scoped reads. See
`PROGRESS.md` for the full per-phase seam list.
