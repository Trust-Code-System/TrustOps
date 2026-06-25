# TrustOps AI — Build Brief: Phase 0 + Phase 1

> You are building the foundation and the daily-use core of TrustOps AI, a multi-tenant business operating system for African SMEs. Build exactly what is specified here. Do not add modules, pages, or features beyond this brief. When a decision isn't specified, follow the patterns in the companion file `trustops-design-system.md`, which is the law for all UI.

## 0. Read first

- Companion file: `trustops-design-system.md`. Every color, spacing value, component, and "done" checklist comes from there. Do not invent tokens or hardcode hex values.
- Stack: **Next.js 14 (App Router) + TypeScript + Tailwind + Supabase (Postgres, Auth, RLS, Storage)**.
- Architecture: **modular monolith**. One codebase, clean internal module boundaries under `/modules`.
- This brief covers Phase 0 (foundation) and Phase 1 (customers, sales, invoicing). Inventory, payments integration, automation, analytics, and AI are explicitly OUT of scope here. Leave clean seams for them but do not build them.

## 1. Non-negotiable rules (read twice)

1. **Multi-tenancy via Row Level Security.** Every domain table has a `company_id`. RLS policies enforce that a user can only ever read/write rows where `company_id` matches their own company. This is enforced at the database level, not in app code. There is no code path that bypasses it.
2. **The sale is one atomic transaction.** Recording a sale creates an invoice, records a payment (if paid), and writes its line items in a single database transaction. All-or-nothing. If any step fails, the whole thing rolls back. Use a Postgres function (RPC) for this, not multiple client-side calls.
3. **Money is integers.** Store all money as integer minor units (kobo). Never store money as floats. Format to ₦ only at display time.
4. **Soft delete, never hard delete** for invoices and customers. Add `deleted_at timestamptz`. Archived rows stay queryable but hidden by default.
5. **Audit every state change** on invoices and payments into `audit_logs`.
6. Server-side validation with **Zod** on every mutation. Never trust the client.

## 2. Project structure

```
/app                      # Next.js App Router routes
  /(auth)                 # login, signup, accept-invite — no shell
  /(app)                  # authenticated app, wrapped in AppShell
    /dashboard
    /customers
    /sales
    /invoices
    /settings
  /api                    # route handlers where needed
/modules
  /auth
  /companies
  /customers
  /sales
  /invoices
  /payments              # stub interface only this phase
  /shared                # types, utils, money, formatting
/components
  /ui                    # canonical design-system components
  /app-shell             # sidebar, topbar, bottom tab bar, FAB
/lib
  /supabase              # client + server + admin clients
  /money.ts              # money helpers (kobo <-> naira, format)
/supabase
  /migrations            # SQL migrations
  /functions             # Postgres RPC functions (e.g. record_sale)
```

## 3. Data model (build these tables with RLS)

Build migrations for each. Every domain table gets `id uuid pk default gen_random_uuid()`, `company_id uuid not null`, `created_at`, `updated_at`. Soft-deletables also get `deleted_at`.

- **companies** — id, name, currency (default 'NGN'), created_at.
- **branches** — id, company_id, name, is_primary.
- **users / profiles** — link to Supabase `auth.users`. Fields: id (= auth uid), company_id, branch_id (nullable), full_name, role (enum: owner, manager, staff, accountant), phone, created_at.
- **customers** — id, company_id, full_name, phone (indexed), email (nullable), notes, deleted_at. Unique (company_id, phone).
- **invoices** — id, company_id, branch_id, customer_id, invoice_number (per-company sequential), status (enum: draft, unpaid, partial, paid, overdue, archived), subtotal, discount, total (all integer kobo), issued_at, due_at, deleted_at. Constraint: total >= 0.
- **invoice_items** — id, company_id, invoice_id, description, quantity, unit_price (kobo), line_total (kobo). Constraint: quantity > 0.
- **payments** — id, company_id, invoice_id, amount (kobo), method (enum: cash, transfer, card, other), reference (nullable), paid_at. Constraint: amount > 0.
- **audit_logs** — id, company_id, actor_id, entity_type, entity_id, action, metadata (jsonb), created_at.

### RLS — apply to every domain table

- Enable RLS on all tables.
- Policy: a row is visible/writable only if `company_id = (select company_id from profiles where id = auth.uid())`.
- Write a single SQL helper `auth_company_id()` (stable function) and reuse it in all policies so the rule is defined once.
- Role-gated writes: only `owner` and `manager` can manage staff, branches, roles. `staff` can record sales/customers but not delete. Enforce role checks in RPC functions and policies, not just UI.

### invoice_number generation

Per-company sequential (INV-0001, INV-0002...). Generate inside the DB (sequence per company or a counter row locked in the transaction) so two concurrent sales never collide on a number.

## 4. The `record_sale` RPC (the heart of Phase 1)

A single Postgres function called transactionally. Input: customer_id, branch_id, line items[], optional payment {amount, method, reference}, due_at. It must, atomically:

1. Validate the actor's company and role.
2. Create the invoice with a fresh per-company invoice_number.
3. Insert invoice_items, compute line_total and invoice total server-side (never trust client totals).
4. If payment provided, insert payment row; set invoice status to `paid` if amount >= total, `partial` if less, else `unpaid`.
5. Write an audit_log entry.
6. Return the created invoice with items and payment.

If anything fails, the entire transaction rolls back. No partial sale ever exists. Write this defensively and test it with a deliberately failing line item.

## 5. Screens to build (Phase 0 + Phase 1)

Each screen must meet the section-7 "done" checklist in the design system (loading, empty, error, populated, mobile, focus, money rules, tokens only).

### Phase 0 — Foundation

1. **Sign up** — creates a company + the first user as `owner`, in one flow. Company name, full name, email, password. On success, land on dashboard with an empty state.
2. **Log in** — email/password via Supabase Auth.
3. **Accept invite** — a user invited to an existing company sets their password and joins with their assigned role. (Invite creation UI lives in Settings.)
4. **App shell** — top bar (branch switcher, notifications placeholder, profile menu), sidebar (desktop) / bottom tab bar + center "Record sale" FAB (mobile), per the design system. Nav items: Home, Sales, Customers, Invoices, More→Settings.
5. **Settings** — company profile, branches (add/edit), staff (invite, assign role, deactivate). Role-gated.

### Phase 1 — Daily-use core

6. **Dashboard / Home** — greeting, 3 KPI cards (Today's revenue, Unpaid total, Customers count), a "Recent sales" list (last 10), and the empty states for a brand-new company. KPI big numbers neutral; only the delta line carries trend color.
7. **Customers** — list (search by name/phone, mobile collapses to cards), add/edit customer (drawer or sheet on mobile), customer detail showing their invoices and total spend.
8. **Record sale** — THE most optimized screen. Pick/quick-add customer, add line items (description, qty, unit price, auto line total), running total, optional immediate payment (amount + method), submit. Minimum taps. Numeric keyboards on money/qty fields. Submit reachable without scrolling on a standard phone. Calls `record_sale` RPC. On success: toast "Sale recorded", route to the new invoice.
9. **Invoices** — list with status pills (paid/unpaid/partial/overdue/archived), filter by status, search. Invoice detail: items, totals, payment history, actions (record payment, send receipt [stub], archive). Archive = soft delete with a named confirm.
10. **Record payment** (against an existing unpaid/partial invoice) — amount, method, reference. Updates invoice status via a small transactional RPC. Audit logged.

## 6. UI implementation order

Build in this order so nothing is blocked:
1. `/lib/supabase` clients + `/lib/money.ts` + shared types.
2. `/components/ui` canonical components from the design system (Button, Input, Select, Card, Badge, Table, MetricCard, Modal/Sheet, Toast, EmptyState, Skeleton). Build these BEFORE any screen so screens compose, not reinvent.
3. App shell + nav.
4. Auth flows + company/user creation.
5. Migrations + RLS + `record_sale` RPC. Verify RLS with a two-company test (Company A cannot read Company B's customers).
6. Customers → Record sale → Invoices → Record payment → Dashboard.

## 7. Quality gates before you call it done

- A user from Company A querying any table returns zero rows from Company B. Prove it.
- Recording a sale with an invalid line item rolls back completely — no orphan invoice, no skipped invoice_number gap that breaks sequencing.
- Two concurrent sales never get the same invoice_number.
- Every money value on screen is tabular-aligned, ₦-formatted, and colored by the money rule.
- Every screen works on a 375px-wide phone: tables become cards, modals become sheets, the Record sale FAB is reachable.
- Keyboard-only: you can complete a full sale without a mouse, focus rings visible throughout.
- No hardcoded hex or spacing anywhere; all from tokens.

## 8. Explicitly out of scope (do NOT build)

Inventory/stock, Paystack/Monnify integration, WhatsApp sending, background jobs/queues, analytics charts beyond the 3 dashboard KPIs, the AI assistant. Leave the `payments` module as a clean interface stub and a `send receipt` button that is wired to a no-op with a "coming soon" toast. These are later phases.

---

**When you finish, report:** what was built, how RLS was verified, how the atomic sale was tested, and any seams left for the out-of-scope phases.
