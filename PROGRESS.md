# TrustOps AI — Build progress

> Single source of truth for what's built. A new session should read this first
> and NOT redo completed phases. Specs: `trustops-design-system.md`,
> `trustops-phase-0-1-brief.md`, `trustops-master-build-spec.md`.
>
> Verify the DB/RLS/RPC gates anytime with: `npm run test:rls` (needs Docker —
> see README). Code gates: `npm run typecheck`, `npm run lint`, `npm run build`.

## Phase 0 — Foundation ✅ DONE
- [x] Next.js 14 + TS + Tailwind scaffold; all design tokens in `globals.css` + `tailwind.config.ts`
- [x] Shared libs: `lib/money.ts` (kobo), supabase client/server/admin, middleware, shared types
- [x] `/components/ui` canonical kit (Button, Input, Select, Card, Badge, DataTable, Modal, Toast, EmptyState, Skeleton, Money, MetricCard…)
- [x] App shell: TopBar (branch switcher, profile), Sidebar, mobile BottomTabBar + Record-sale FAB
- [x] Auth: login, signup (company + owner via `bootstrap_company` RPC), accept-invite, middleware gating
- [x] Schema migrations `0001`–`0003`: 8 tables, RLS on all (`auth_company_id()`), `record_sale`/`record_payment` RPCs
- [x] Role-gated Settings (company, branches, staff invite/role/deactivate)
- [x] Two-company RLS isolation proven

## Phase 1 — Customers + Sales + Invoicing ✅ DONE
- [x] Customers: list (search), add/edit sheet, detail (invoices + total spend), archive (soft delete, admin)
- [x] Record sale: optimized form (customer pick + quick-add, line items, running total, optional payment) → `record_sale`
- [x] Invoices: list (status filter + search + pills), detail (items, totals, payment history)
- [x] Record payment modal → `record_payment` RPC; `archive_invoice` RPC (`0004`); send-receipt stub toast
- [x] Dashboard: greeting + 3 KPI cards (today revenue + delta, unpaid total, customers) + recent sales
- [x] `/sales` → `/invoices` redirect (no separate sales-list screen in spec)
- [x] Verification: `npm run test:rls` = 24/24 (isolation + atomic rollback + payment lifecycle + role gating)

## Phase 2 — Inventory ✅ DONE
_(See master spec PHASE 2. Payments/Phase 3+ explicitly NOT in scope.)_
- [x] Migration `0005`: `products`, `inventory`, `stock_movements` (+ `invoice_items.product_id`), RLS, indexes, grants
- [x] Migration `0006`: inventory RPCs (`create_product`, `update_product`, `adjust_stock`, `transfer_stock`) + `record_sale` stock integration
- [x] TS types + `database.types.ts` + inventory module (schemas/queries/actions)
- [x] Products list (search, category/active/low-stock filters) + add/edit (`StockBadge` added to UI kit)
- [x] Product detail (stock across branches, movement ledger, edit, deactivate)
- [x] Stock adjustment (restock/adjustment/return, required reason, admin) — modal on product detail
- [x] Stock transfer (branch→branch, atomic) — modal on product detail
- [x] Low-stock: products filter (`?low=1`) + dashboard widget
- [x] Record sale: product picker per line item (free-text still supported); decrements stock atomically
- [x] Nav: Products in sidebar + mobile "More" sheet
- [x] Quality gates: `npm run test:rls` = **36/36** (incl. oversell fails wholly; quantity == Σ movements; transfer conserves total; inventory cross-tenant isolation; staff can't adjust). typecheck + lint + build green.

## Phase 3 — Payments integration (Paystack + Monnify) — SKIPPED (deferred per user)
_Not built. User asked to hold off on payments; the Phase 1 manual cash/transfer
path remains the only payment route. `modules/payments` stub still in place._

## Phase 4 — Automation & background jobs ✅ DONE
_(Master spec PHASE 4. Built after skipping Phase 3.)_
- [x] Migration `0007`: `notification_settings`, `notifications`, `jobs`, `job_runs`, `scheduled_jobs` + RLS + indexes + event-driven low-stock trigger on `inventory`
- [x] Migration `0008`: queue RPCs (`enqueue_job`, `claim_job` w/ SKIP LOCKED, `complete_job`, `fail_job` w/ backoff+dead-letter, `requeue_stuck_jobs`, `tick_scheduler`), `enqueue_notification`, `mark_notification_result`, `mark_notification_read`/`_all`, `transition_overdue_invoices`; seeded schedules; shim adds `service_role`
- [x] Queue tech: **Postgres-backed durable queue** behind `modules/jobs/queue.ts` (swappable for BullMQ/pg_cron)
- [x] Messaging: `MessagingProvider` interface + WhatsApp + Email (Resend) adapters with **simulated no-op** fallback (no live calls until keys); templates renderer
- [x] Handlers: invoice reminders (cadence-deduped), stock alerts (event-driven), daily report, receipt delivery, overdue transition
- [x] Worker: `modules/jobs/worker.ts` (requeue→tick→drain jobs→dispatch notifications) + `scripts/worker.ts` + `npm run worker`
- [x] UI: in-app notifications bell (real, replaces placeholder), Notifications settings section (role-gated), "Send receipt" now enqueues, receipt enqueued on sale, mobile More sheet unaffected
- [x] Quality gates: `npm run test:rls` = **51/51** (idempotent enqueue, job dead-letter + job_runs log, notification retry→dead-letter, reminder cadence dedupe, overdue transition + audit, event-driven stock-alert trigger, scheduler tick, automation tenant isolation). typecheck + lint + build green.

## Phase 5 — Analytics ✅ DONE
_(Master spec PHASE 5. Built after Phase 4; Phase 3 payments still deferred.)_
- [x] Migration `0009`: `daily_metrics` (cached read model, company-wide + per-branch, unique nulls-not-distinct on company/branch/date) + `expenses` (soft delete) + RLS (select-only; writes are RPC-only) + indexes
- [x] RPCs: `save_expense`/`archive_expense` (Zod + role-gated owner/manager/accountant + audit), `aggregate_daily_metrics(from,to)` (idempotent rebuild, payment-date revenue / invoice-date sales+COGS / spent-date expenses; service_role only), `analytics_top_products`/`analytics_top_customers` (scoped, capped leaderboards)
- [x] Aggregation wired into the Phase 4 jobs engine: `analytics_daily_metrics` handler + seeded daily schedule (no new queue tech)
- [x] Analytics module (`modules/analytics`): cached dashboard query (`unstable_cache`, 60s TTL), live "today" from source tables + historical from `daily_metrics`, aging buckets, branch comparison, expense list/categories/breakdown; `getReportData` + pure `reportToCsv`
- [x] Analytics dashboard: date-range picker, KPI cards (revenue + delta, profit, expenses, outstanding), revenue-over-time bars, top products/customers, aging, branch comparison; trend color only on the delta
- [x] Expenses: list (category + date filters, paginated) + add/edit sheet (role-gated), soft delete
- [x] Reports: server-rendered period summary + **CSV export** (`/api/reports/export`, RLS-scoped route) + **Save as PDF** (print-isolated `#print-area`); nav (sidebar + mobile More) already linked
- [x] Quality gates: `npm run test:rls` = **65/65** (aggregate revenue/sales/expenses reconcile vs raw source; aggregation idempotent; expense role gating; RPC-only writes; soft delete excluded from live reads; create+archive audited; `daily_metrics`/`expenses` tenant isolation). Dashboard reads are cached + paginated. typecheck + lint + build green.

## Phase 6 — AI assistant ✅ DONE
_(Master spec PHASE 6. Built on Phases 1–5; Phase 3 payments still deferred.)_
- [x] Migration `0010`: `ai_settings`, `ai_conversations`, `ai_messages`, `ai_usage`, `ai_insights` + RLS. Conversations/messages/usage scoped **per company AND per user** (`user_id = auth.uid()`) — no cross-tenant or cross-user memory. RPCs: `save_ai_settings` (owner-only + audit), `ai_month_usd_cents` (tenant-scoped spend). `ai_insights` seeded as a daily scheduled job.
- [x] AI provider spend is integer **USD cents** (not kobo — the one honest currency exception), logged per turn in `ai_usage` and capped per company via `ai_settings.monthly_cap_usd_cents`.
- [x] `modules/ai`: scoped **tool surface** (`get_financial_summary`/`get_top_products`/`get_top_customers`/`get_unpaid_invoices`/`get_low_stock`/`find_customer`) — each wraps an existing RLS-scoped Phase 1–5 query, so the model never gets raw SQL/DB access and cannot widen scope. Manual **orchestrator loop** (`@anthropic-ai/sdk`, `claude-opus-4-8`): grounding system prompt, capped steps, per-call token→cost accounting, read-only (drafts only, never mutates).
- [x] One turn = shared `prepareTurn` (enabled gate → budget gate → conversation/user-message persistence → grounded system prompt + capped history) → orchestrator → `persistAssistantTurn` (assistant msg + usage log + bump). Used by BOTH paths so gates never drift: **live SSE streaming** route `POST /api/assistant/stream` (token-by-token, `runAssistantStream`) for the chat UI, and the non-streaming `sendAssistantMessage` server action as a programmatic fallback. `saveAiSettings` owner-gated. No `ANTHROPIC_API_KEY` ⇒ assistant cleanly disabled (no live calls); rest of app unaffected.
- [x] **Proactive insights** are rule-based over Phase 5 aggregates (revenue trend, low stock, overdue) — not freeform generation — written by the `ai_insights` job on the Phase 4 engine and surfaced as grounded dashboard cards.
- [x] Screens: Assistant chat (history, suggested prompts, every answer shows its source figures), AI settings section (owner: enable + USD cap + month spend), dashboard Insights widget. Nav: Assistant in sidebar + mobile More.
- [x] Quality gates: `npm run test:rls` = **78/78** (AI tables tenant-isolated; **per-user memory** — staff can't read another user's chats; usage can't be logged under another user's id; settings owner-only + audited; `ai_month_usd_cents` tenant-scoped). Cross-tenant prompt safety is **structural**: every tool runs through the same RLS client, proven by the Phase 1–5 isolation gates. typecheck + lint + build green.

## Seams left for later phases (do not remove)
- `modules/payments/index.ts` — gateway adapter stub (Phase 3)
- "Send receipt" — no-op toast (becomes real in Phase 4)
- `overdue` status derived at read time (Phase 4 job will flip it)
- `products.cost_price` captured now, used by Phase 5 profit/COGS ✅ now consumed by `aggregate_daily_metrics` COGS + analytics profit
- Branch selection persisted client-side (full branch-scoped reads later)
- `daily_metrics` already stores per-branch rows; UI currently reads company-wide + branch-comparison only — full branch-filtered dashboards are a clean later add
- `unstable_cache` 60s TTL on the analytics dashboard — swap for Redis/tagged revalidation when read pressure grows (revalidated via `revalidatePath` on expense writes)
- `analytics_top_products`/`analytics_top_customers` read `invoices` live; promote to `daily_metrics`-backed rollups if leaderboards get heavy
- Reports export = CSV (server route) + browser-print PDF; a server-rendered PDF (e.g. via a render service) is a drop-in later
- Phase 6 AI tools call the existing scoped `modules/analytics`/`invoices`/`inventory`/`customers` queries — ✅ done; any NEW tool must reuse a scoped query, never open an unscoped data path
- AI assistant: ✅ live SSE token streaming (`/api/assistant/stream` + `runAssistantStream`); `max_tokens` 1024 per turn — raise if longer answers are wanted
- AI tools run per-call (no prompt caching yet) — add `cache_control` on the stable system+tools prefix when traffic grows
- AI insights are rule-based (revenue trend / low stock / overdue); the seam to add LLM-summarised insights stays behind the same scheduled job + grounded figures
- AI spend cap enforced per calendar month in USD cents; a hard per-turn token ceiling (`task_budget`) is a later add
- Phase 3 (Payments) still deferred — `modules/payments` stub remains the only seam not yet built
