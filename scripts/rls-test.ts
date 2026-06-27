/**
 * Two-company RLS isolation test (the Phase 0 quality gate).
 *
 * Applies the TEST-ONLY auth shim, then the REAL migrations (schema → RLS →
 * functions) to a Postgres instance, then proves that:
 *   1. A user from Company A reads ZERO rows from Company B (every table).
 *   2. A user cannot write into another company (RLS WITH CHECK blocks it).
 *   3. record_sale enforces tenancy on the customer it references.
 *   4. record_sale is atomic: a bad line item rolls the WHOLE sale back — no
 *      orphan invoice, and no invoice_number gap (the counter is not advanced).
 *   5. Per-company invoice numbers are sequential and unique.
 *
 * Run against a throwaway Postgres (see README): `npm run test:rls`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Client } from "pg";

const ROOT = process.cwd();
const MIGRATIONS = [
  "supabase/migrations/0001_schema.sql",
  "supabase/migrations/0002_rls.sql",
  "supabase/migrations/0003_functions.sql",
  "supabase/migrations/0004_archive_invoice.sql",
  "supabase/migrations/0005_inventory.sql",
  "supabase/migrations/0006_inventory_functions.sql",
  "supabase/migrations/0007_automation.sql",
  "supabase/migrations/0008_automation_functions.sql",
  "supabase/migrations/0009_analytics.sql",
  "supabase/migrations/0010_ai.sql",
  "supabase/migrations/0012_fix_low_stock_dedupe.sql",
  "supabase/migrations/0013_payments.sql",
  "supabase/migrations/0014_offline_idempotency.sql",
  "supabase/migrations/0015_public_invoice.sql",
  "supabase/migrations/0016_ai_actions.sql",
  "supabase/migrations/0017_storefront.sql",
];
const SHIM = "scripts/test/auth-shim.sql";

const CONN =
  process.env.RLS_TEST_DATABASE_URL ??
  "postgres://postgres:postgres@localhost:55432/postgres";

const client = new Client({ connectionString: CONN });

// --- tiny assertion harness --------------------------------------------------
let passed = 0;
const failures: string[] = [];
function check(name: string, ok: boolean) {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(name);
    console.log(`  ✗ ${name}`);
  }
}

/** Run SQL as a signed-in user (RLS applies; auth.uid() = uid). */
async function asUser<T extends Record<string, unknown> = Record<string, unknown>>(
  uid: string,
  sql: string,
  params: unknown[] = [],
): Promise<{ rows: T[]; rowCount: number }> {
  await client.query("begin");
  try {
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: uid }),
    ]);
    const res = await client.query(sql, params);
    await client.query("commit");
    return { rows: res.rows as T[], rowCount: res.rowCount ?? 0 };
  } catch (e) {
    await client.query("rollback");
    throw e;
  }
}

/** Expect the action (run as `uid`) to be rejected by the database. */
async function expectReject(
  name: string,
  uid: string,
  sql: string,
  params: unknown[] = [],
) {
  try {
    await asUser(uid, sql, params);
    check(name, false);
  } catch {
    check(name, true);
  }
}

async function main() {
  await client.connect();

  console.log("Applying auth shim + migrations...");
  await client.query(readFileSync(join(ROOT, SHIM), "utf8"));
  for (const m of MIGRATIONS) {
    await client.query(readFileSync(join(ROOT, m), "utf8"));
  }

  // Two owners (auth users) — Supabase Auth would create these.
  const ownerA = randomUUID();
  const ownerB = randomUUID();
  await client.query(
    "insert into auth.users (id, email) values ($1,$2),($3,$4)",
    [ownerA, "a@a.com", ownerB, "b@b.com"],
  );

  console.log("\nBootstrapping two companies (via bootstrap_company RPC)...");
  await asUser(ownerA, "select bootstrap_company($1,$2)", ["Company A", "Owner A"]);
  await asUser(ownerB, "select bootstrap_company($1,$2)", ["Company B", "Owner B"]);

  const companyA = (
    await asUser<{ auth_company_id: string }>(ownerA, "select auth_company_id()")
  ).rows[0].auth_company_id;
  const companyB = (
    await asUser<{ auth_company_id: string }>(ownerB, "select auth_company_id()")
  ).rows[0].auth_company_id;

  // Each company adds a customer.
  const custA = (
    await asUser<{ id: string }>(
      ownerA,
      "insert into customers (company_id, full_name, phone) values ($1,'Acme A','0801') returning id",
      [companyA],
    )
  ).rows[0].id;
  const custB = (
    await asUser<{ id: string }>(
      ownerB,
      "insert into customers (company_id, full_name, phone) values ($1,'Beta B','0802') returning id",
      [companyB],
    )
  ).rows[0].id;

  // A staff member in Company A (as if invited) — for role-gate checks.
  const staffA = randomUUID();
  await client.query("insert into auth.users (id, email) values ($1,$2)", [
    staffA,
    "staff@a.com",
  ]);
  await client.query(
    "insert into profiles (id, company_id, full_name, role, is_active) values ($1,$2,'Staff A','staff',true)",
    [staffA, companyA],
  );

  // Company A records a real sale so there is invoice/payment data to isolate.
  await asUser(ownerA, "select record_sale($1::jsonb)", [
    JSON.stringify({
      customer_id: custA,
      discount: 0,
      items: [{ description: "Bag of rice", quantity: 2, unit_price: 5000_00 }],
      payment: { amount: 10000_00, method: "cash" },
    }),
  ]);

  // =========================================================================
  console.log("\n[1] Cross-tenant reads return ZERO rows from the other company");
  // =========================================================================
  const aSeesCustomers = await asUser(ownerA, "select id, company_id from customers");
  check(
    "A sees only A's customers (1 row, none from B)",
    aSeesCustomers.rowCount === 1 &&
      aSeesCustomers.rows.every((r) => r.company_id === companyA),
  );

  const aSeesBCustomerById = await asUser(
    ownerA,
    "select id from customers where id = $1",
    [custB],
  );
  check("A cannot read B's customer by id (0 rows)", aSeesBCustomerById.rowCount === 0);

  const bSeesCustomers = await asUser(ownerB, "select id, company_id from customers");
  check(
    "B sees only B's customers (1 row, none from A)",
    bSeesCustomers.rowCount === 1 &&
      bSeesCustomers.rows.every((r) => r.company_id === companyB),
  );

  const aSeesCompanies = await asUser(ownerA, "select id from companies");
  check(
    "A sees only its own company row",
    aSeesCompanies.rowCount === 1 && aSeesCompanies.rows[0].id === companyA,
  );

  const aSeesProfiles = await asUser(ownerA, "select company_id from profiles");
  check(
    "A sees only profiles in company A (owner + staff, none from B)",
    aSeesProfiles.rowCount === 2 &&
      aSeesProfiles.rows.every((r) => r.company_id === companyA),
  );

  const aSeesInvoices = await asUser(ownerA, "select company_id from invoices");
  const bSeesInvoices = await asUser(ownerB, "select company_id from invoices");
  check("A sees its own invoice", aSeesInvoices.rowCount === 1);
  check("B sees ZERO invoices (A's sale is invisible to B)", bSeesInvoices.rowCount === 0);

  const bSeesItems = await asUser(ownerB, "select id from invoice_items");
  const bSeesPayments = await asUser(ownerB, "select id from payments");
  check("B sees ZERO invoice_items from A", bSeesItems.rowCount === 0);
  check("B sees ZERO payments from A", bSeesPayments.rowCount === 0);

  // Aggregate sweep: from B's session, count any row that belongs to company A
  // across every table. RLS should make all of A's data invisible → 0.
  const bSeesAsData = await asUser<{ n: string }>(
    ownerB,
    `select (select count(*) from customers     where company_id = $1)
          + (select count(*) from invoices      where company_id = $1)
          + (select count(*) from invoice_items where company_id = $1)
          + (select count(*) from payments      where company_id = $1)
          + (select count(*) from profiles      where company_id = $1)
          + (select count(*) from branches      where company_id = $1)
          + (select count(*) from companies     where id = $1) as n`,
    [companyA],
  );
  check("B's total visibility into A's data is 0 rows", Number(bSeesAsData.rows[0].n) === 0);

  // =========================================================================
  console.log("\n[2] Cross-tenant writes are blocked");
  // =========================================================================
  await expectReject(
    "A cannot INSERT a customer tagged as company B",
    ownerA,
    "insert into customers (company_id, full_name, phone) values ($1,'Sneaky','0900')",
    [companyB],
  );

  const aUpdatesB = await asUser(
    ownerA,
    "update customers set full_name = 'Hacked' where id = $1",
    [custB],
  );
  check("A's UPDATE of B's customer affects 0 rows", aUpdatesB.rowCount === 0);

  // =========================================================================
  console.log("\n[3] record_sale enforces tenancy on the referenced customer");
  // =========================================================================
  await expectReject(
    "A cannot record a sale against B's customer",
    ownerA,
    "select record_sale($1::jsonb)",
    [
      JSON.stringify({
        customer_id: custB,
        items: [{ description: "x", quantity: 1, unit_price: 100 }],
      }),
    ],
  );

  // =========================================================================
  console.log("\n[4] record_sale is atomic — a bad line item rolls everything back");
  // =========================================================================
  const seqBefore = (
    await client.query("select invoice_seq from companies where id = $1", [companyA])
  ).rows[0].invoice_seq;
  const invCountBefore = (
    await asUser(ownerA, "select id from invoices")
  ).rowCount;

  await expectReject(
    "A sale with a quantity-0 item is rejected",
    ownerA,
    "select record_sale($1::jsonb)",
    [
      JSON.stringify({
        customer_id: custA,
        items: [
          { description: "Good", quantity: 1, unit_price: 1000 },
          { description: "Bad", quantity: 0, unit_price: 1000 },
        ],
      }),
    ],
  );

  const seqAfter = (
    await client.query("select invoice_seq from companies where id = $1", [companyA])
  ).rows[0].invoice_seq;
  const invCountAfter = (await asUser(ownerA, "select id from invoices")).rowCount;
  check("No orphan invoice was created (count unchanged)", invCountAfter === invCountBefore);
  check(
    "No invoice_number gap (counter not advanced by the failed sale)",
    seqAfter === seqBefore,
  );

  // =========================================================================
  console.log("\n[5] Per-company invoice numbers are sequential and unique");
  // =========================================================================
  await asUser(ownerA, "select record_sale($1::jsonb)", [
    JSON.stringify({
      customer_id: custA,
      items: [{ description: "Item", quantity: 1, unit_price: 2500 }],
    }),
  ]);
  const numbers = (
    await asUser<{ invoice_number: string }>(
      ownerA,
      "select invoice_number from invoices order by invoice_number",
    )
  ).rows.map((r) => r.invoice_number);
  check(
    "Invoice numbers are INV-0001, INV-0002 (sequential, no gap from the failed sale)",
    JSON.stringify(numbers) === JSON.stringify(["INV-0001", "INV-0002"]),
  );

  // =========================================================================
  console.log("\n[6] record_payment drives invoice status (unpaid → partial → paid)");
  // =========================================================================
  const unpaidSale = (
    await asUser<{ record_sale: { invoice: { id: string; status: string } } }>(
      ownerA,
      "select record_sale($1::jsonb)",
      [
        JSON.stringify({
          customer_id: custA,
          items: [{ description: "Crate of drinks", quantity: 1, unit_price: 3000_00 }],
        }),
      ],
    )
  ).rows[0].record_sale;
  check("New unpaid sale starts as 'unpaid'", unpaidSale.invoice.status === "unpaid");

  await asUser(ownerA, "select record_payment($1::jsonb)", [
    JSON.stringify({ invoice_id: unpaidSale.invoice.id, amount: 1000_00, method: "cash" }),
  ]);
  const afterPartial = (
    await asUser<{ status: string }>(
      ownerA,
      "select status from invoices where id = $1",
      [unpaidSale.invoice.id],
    )
  ).rows[0].status;
  check("Part payment moves it to 'partial'", afterPartial === "partial");

  await asUser(ownerA, "select record_payment($1::jsonb)", [
    JSON.stringify({ invoice_id: unpaidSale.invoice.id, amount: 2000_00, method: "transfer" }),
  ]);
  const afterFull = (
    await asUser<{ status: string }>(
      ownerA,
      "select status from invoices where id = $1",
      [unpaidSale.invoice.id],
    )
  ).rows[0].status;
  check("Full payment moves it to 'paid'", afterFull === "paid");

  // =========================================================================
  console.log("\n[7] Role gating: staff can record sales but not archive/delete");
  // =========================================================================
  const staffSale = await asUser<{ record_sale: { invoice: { id: string } } }>(
    staffA,
    "select record_sale($1::jsonb)",
    [
      JSON.stringify({
        customer_id: custA,
        items: [{ description: "Staff sale", quantity: 1, unit_price: 500_00 }],
      }),
    ],
  );
  check("Staff CAN record a sale", !!staffSale.rows[0].record_sale.invoice.id);

  await expectReject(
    "Staff CANNOT archive an invoice (org-admin only)",
    staffA,
    "select archive_invoice($1)",
    [unpaidSale.invoice.id],
  );
  await expectReject(
    "Staff CANNOT soft-delete a customer (RLS WITH CHECK)",
    staffA,
    "update customers set deleted_at = now() where id = $1",
    [custA],
  );

  // Owner archives; it leaves the default (live) list but stays on record.
  await asUser(ownerA, "select archive_invoice($1)", [unpaidSale.invoice.id]);
  const liveAfterArchive = await asUser(
    ownerA,
    "select id from invoices where id = $1 and deleted_at is null",
    [unpaidSale.invoice.id],
  );
  check("Owner CAN archive — invoice leaves the live list", liveAfterArchive.rowCount === 0);

  // =========================================================================
  console.log("\n[8] Inventory (Phase 2): cross-tenant isolation");
  // =========================================================================
  const branchA1 = (
    await client.query(
      "select id from branches where company_id = $1 and is_primary",
      [companyA],
    )
  ).rows[0].id;
  // A second branch in Company A for the transfer test.
  const branchA2 = randomUUID();
  await client.query(
    "insert into branches (id, company_id, name) values ($1,$2,'Ikeja')",
    [branchA2, companyA],
  );

  const created = await asUser<{ create_product: { id: string } }>(
    ownerA,
    "select create_product($1::jsonb)",
    [
      JSON.stringify({
        name: "Ankara Fabric",
        sell_price: 5000_00,
        cost_price: 3000_00,
        initial_stock: [{ branch_id: branchA1, quantity: 10, low_stock_threshold: 3 }],
      }),
    ],
  );
  const productId = created.rows[0].create_product.id;
  check("create_product seeds initial stock (product created)", !!productId);

  const bProducts = await asUser(ownerB, "select id from products");
  const bInventory = await asUser(ownerB, "select id from inventory");
  const bMovements = await asUser(ownerB, "select id from stock_movements");
  check("B sees ZERO of A's products", bProducts.rowCount === 0);
  check("B sees ZERO of A's inventory", bInventory.rowCount === 0);
  check("B sees ZERO of A's stock movements", bMovements.rowCount === 0);

  // =========================================================================
  console.log("\n[9] A sale exceeding stock fails entirely (no invoice, no decrement)");
  // =========================================================================
  const invBefore = (await asUser(ownerA, "select id from invoices")).rowCount;
  const qtyBefore = (
    await client.query(
      "select quantity from inventory where branch_id = $1 and product_id = $2",
      [branchA1, productId],
    )
  ).rows[0].quantity;

  await expectReject(
    "Selling 100 of a 10-stock product is rejected",
    ownerA,
    "select record_sale($1::jsonb)",
    [
      JSON.stringify({
        customer_id: custA,
        branch_id: branchA1,
        items: [
          { product_id: productId, description: "Ankara Fabric", quantity: 100, unit_price: 5000_00 },
        ],
      }),
    ],
  );

  const invAfter = (await asUser(ownerA, "select id from invoices")).rowCount;
  const qtyAfter = (
    await client.query(
      "select quantity from inventory where branch_id = $1 and product_id = $2",
      [branchA1, productId],
    )
  ).rows[0].quantity;
  check("No invoice created by the failed oversell", invAfter === invBefore);
  check("Stock not decremented by the failed oversell", qtyAfter === qtyBefore);

  // =========================================================================
  console.log("\n[10] A valid product sale decrements stock; quantity == Σ movements");
  // =========================================================================
  await asUser(ownerA, "select record_sale($1::jsonb)", [
    JSON.stringify({
      customer_id: custA,
      branch_id: branchA1,
      items: [
        { product_id: productId, description: "Ankara Fabric", quantity: 4, unit_price: 5000_00 },
      ],
    }),
  ]);
  const qtyAfterSale = (
    await client.query(
      "select quantity from inventory where branch_id = $1 and product_id = $2",
      [branchA1, productId],
    )
  ).rows[0].quantity;
  check("Stock decremented 10 → 6 after selling 4", qtyAfterSale === 6);

  const mismatches = (
    await client.query(
      `select count(*)::int as n from (
         select i.quantity,
           coalesce((select sum(quantity_delta) from stock_movements m
                     where m.branch_id = i.branch_id and m.product_id = i.product_id), 0) as ledger
         from inventory i
       ) t where quantity <> ledger`,
    )
  ).rows[0].n;
  check("Every inventory.quantity equals the sum of its movements", mismatches === 0);

  // =========================================================================
  console.log("\n[11] Stock transfer conserves total; role gating on stock");
  // =========================================================================
  const totalBefore = (
    await client.query(
      "select coalesce(sum(quantity),0)::int as n from inventory where product_id = $1",
      [productId],
    )
  ).rows[0].n;

  await asUser(ownerA, "select transfer_stock($1::jsonb)", [
    JSON.stringify({
      product_id: productId,
      from_branch_id: branchA1,
      to_branch_id: branchA2,
      quantity: 2,
    }),
  ]);

  const totalAfter = (
    await client.query(
      "select coalesce(sum(quantity),0)::int as n from inventory where product_id = $1",
      [productId],
    )
  ).rows[0].n;
  check("Transfer conserves total quantity (nothing created/lost)", totalAfter === totalBefore);

  const a2qty = (
    await client.query(
      "select quantity from inventory where branch_id = $1 and product_id = $2",
      [branchA2, productId],
    )
  ).rows[0].quantity;
  check("Destination branch received the transferred 2", a2qty === 2);

  await expectReject(
    "Staff CANNOT adjust stock (org-admin only)",
    staffA,
    "select adjust_stock($1::jsonb)",
    [
      JSON.stringify({
        product_id: productId,
        branch_id: branchA1,
        type: "restock",
        quantity_delta: 5,
        reason: "test",
      }),
    ],
  );

  // =========================================================================
  console.log("\n[12] Automation (Phase 4): event-driven stock-alert trigger");
  // =========================================================================
  // Product currently has 4 at branchA1 (threshold 3). Sell 2 → 2 (<=3): the
  // inventory trigger should enqueue a stock_alert job.
  await asUser(ownerA, "select record_sale($1::jsonb)", [
    JSON.stringify({
      customer_id: custA,
      branch_id: branchA1,
      items: [{ product_id: productId, description: "Ankara Fabric", quantity: 2, unit_price: 5000_00 }],
    }),
  ]);
  const stockJobs = await client.query(
    "select id from jobs where type='stock_alert' and company_id=$1 and (payload->>'product_id')=$2",
    [companyA, productId],
  );
  check("Dropping stock past threshold enqueues a stock_alert job", stockJobs.rowCount === 1);

  // =========================================================================
  console.log("\n[13] Scheduler tick enqueues due recurring jobs");
  // =========================================================================
  const ticked = (await client.query("select tick_scheduler() as n")).rows[0].n;
  check("tick_scheduler enqueues the 5 seeded schedules", Number(ticked) === 5);

  // =========================================================================
  console.log("\n[14] Enqueue is idempotent (dedupe_key)");
  // =========================================================================
  const j1 = (await client.query("select enqueue_job('noop','{}'::jsonb,null,now(),'dupe:k1',5) as id")).rows[0].id;
  const j2 = (await client.query("select enqueue_job('noop','{}'::jsonb,null,now(),'dupe:k1',5) as id")).rows[0].id;
  const jobDupeCount = (await client.query("select count(*)::int n from jobs where dedupe_key='dupe:k1'")).rows[0].n;
  check("Duplicate enqueue with same key → one job (second returns null)", j1 && !j2 && jobDupeCount === 1);

  await client.query(
    "select enqueue_notification($1,'in_app','daily_report','{}'::jsonb,null,'dupe:n1',now())",
    [companyA],
  );
  await client.query(
    "select enqueue_notification($1,'in_app','daily_report','{}'::jsonb,null,'dupe:n1',now())",
    [companyA],
  );
  const notifDupe = (await client.query("select count(*)::int n from notifications where dedupe_key='dupe:n1'")).rows[0].n;
  check("Duplicate notification with same key → one row (cadence guard)", notifDupe === 1);

  // =========================================================================
  console.log("\n[15] Failing job retries then dead-letters; runs are logged");
  // =========================================================================
  const dlId = (await client.query("select enqueue_job('always_fails','{}'::jsonb,null,now(),'dl:1',2) as id")).rows[0].id;
  // Simulate two claim→fail cycles on THIS job (claim_job picks the oldest job
  // globally; here we drive the specific job's attempts to test fail_job).
  await client.query("update jobs set attempts=1, status='running' where id=$1", [dlId]);
  await client.query("select fail_job($1,'boom')", [dlId]);        // 1 < 2 → queued
  await client.query("update jobs set attempts=2, status='running' where id=$1", [dlId]);
  await client.query("select fail_job($1,'boom again')", [dlId]);  // 2 >= 2 → dead
  const dlStatus = (await client.query("select status from jobs where id=$1", [dlId])).rows[0].status;
  const dlRuns = (await client.query("select count(*)::int n from job_runs where job_id=$1 and status='failed'", [dlId])).rows[0].n;
  check("Job dead-letters after max attempts", dlStatus === "dead");
  check("Each failed attempt is logged in job_runs", dlRuns === 2);

  // =========================================================================
  console.log("\n[16] Notification dispatch: retry then dead-letter; success path");
  // =========================================================================
  const nFail = (await client.query(
    "select enqueue_notification($1,'whatsapp','receipt','{}'::jsonb,'+234','dl:n2',now()) as id",
    [companyA],
  )).rows[0].id;
  for (let i = 0; i < 5; i++) {
    await client.query("select mark_notification_result($1,false,'send failed')", [nFail]);
  }
  const nFailStatus = (await client.query("select status, attempts from notifications where id=$1", [nFail])).rows[0];
  check("Notification dead-letters as 'failed' after 5 attempts", nFailStatus.status === "failed" && nFailStatus.attempts === 5);

  const nOk = (await client.query(
    "select enqueue_notification($1,'in_app','receipt','{}'::jsonb,null,'ok:n3',now()) as id",
    [companyA],
  )).rows[0].id;
  await client.query("select mark_notification_result($1,true,null)", [nOk]);
  const nOkStatus = (await client.query("select status, sent_at from notifications where id=$1", [nOk])).rows[0];
  check("Successful send marks notification 'sent'", nOkStatus.status === "sent" && !!nOkStatus.sent_at);

  // =========================================================================
  console.log("\n[17] Overdue transition flips past-due invoices and audits");
  // =========================================================================
  await client.query(
    `insert into invoices (company_id, customer_id, invoice_number, status, total, due_at)
     values ($1,$2,'INV-9999','unpaid',1000, now() - interval '2 days')`,
    [companyA, custA],
  );
  const flipped = (await client.query("select transition_overdue_invoices() as n")).rows[0].n;
  const odStatus = (await client.query("select status from invoices where company_id=$1 and invoice_number='INV-9999'", [companyA])).rows[0].status;
  const odAudit = (await client.query("select count(*)::int n from audit_logs where action='invoice.overdue' and company_id=$1", [companyA])).rows[0].n;
  check("transition_overdue_invoices flips at least one invoice", Number(flipped) >= 1);
  check("The past-due invoice is now 'overdue'", odStatus === "overdue");
  check("Overdue transition writes an audit log", odAudit >= 1);

  // =========================================================================
  console.log("\n[18] Automation tables are tenant-isolated");
  // =========================================================================
  const bNotifs = await asUser(ownerB, "select id from notifications");
  const bJobs = await asUser(ownerB, "select id from jobs");
  const bSettings = await asUser(ownerB, "select company_id from notification_settings");
  const aNotifs = await asUser(ownerA, "select id from notifications");
  check("B sees ZERO of A's notifications", bNotifs.rowCount === 0);
  check("B sees ZERO of A's jobs", bJobs.rowCount === 0);
  check("B sees ZERO of A's notification settings", bSettings.rowCount === 0);
  check("A can see its own notifications", aNotifs.rowCount > 0);

  // =========================================================================
  console.log("\n[19] Analytics (Phase 5): aggregates reconcile against raw tables");
  // =========================================================================
  // Owner records an expense (RPC-only path), then the aggregation job rebuilds
  // daily_metrics for the window. The cached company-wide row must equal the
  // raw source tables for today.
  await asUser(ownerA, "select save_expense($1::jsonb)", [
    JSON.stringify({ category: "Rent", amount: 200000 }),
  ]);
  await client.query("select aggregate_daily_metrics()");

  const recon = (
    await client.query(
      `select
         (select coalesce(sum(amount),0)::bigint from payments
            where company_id=$1 and paid_at::date = current_date)               as raw_rev,
         (select revenue from daily_metrics
            where company_id=$1 and branch_id is null and date = current_date)   as agg_rev,
         (select count(*)::int from invoices
            where company_id=$1 and deleted_at is null
              and issued_at::date = current_date)                                as raw_sales,
         (select sales_count from daily_metrics
            where company_id=$1 and branch_id is null and date = current_date)   as agg_sales,
         (select coalesce(sum(amount),0)::bigint from expenses
            where company_id=$1 and deleted_at is null
              and spent_at::date = current_date)                                 as raw_exp,
         (select expenses from daily_metrics
            where company_id=$1 and branch_id is null and date = current_date)   as agg_exp`,
      [companyA],
    )
  ).rows[0];
  check(
    "daily_metrics revenue == summed payments for the day (and is non-zero)",
    Number(recon.agg_rev) === Number(recon.raw_rev) && Number(recon.raw_rev) > 0,
  );
  check(
    "daily_metrics sales_count == counted invoices for the day",
    Number(recon.agg_sales) === Number(recon.raw_sales) && Number(recon.raw_sales) > 0,
  );
  check(
    "daily_metrics expenses == summed expenses for the day (== ₦2,000)",
    Number(recon.agg_exp) === Number(recon.raw_exp) && Number(recon.raw_exp) === 200000,
  );

  // Re-running the job must not double-count (idempotent rebuild).
  await client.query("select aggregate_daily_metrics()");
  const reRev = (
    await client.query(
      "select revenue from daily_metrics where company_id=$1 and branch_id is null and date = current_date",
      [companyA],
    )
  ).rows[0].revenue;
  check("Re-running aggregation is idempotent (revenue unchanged)", Number(reRev) === Number(recon.agg_rev));

  // =========================================================================
  console.log("\n[20] Expense RPC: role gating, soft delete, audit");
  // =========================================================================
  await expectReject(
    "Staff CANNOT record an expense (owner/manager/accountant only)",
    staffA,
    "select save_expense($1::jsonb)",
    [JSON.stringify({ category: "Snacks", amount: 5000 })],
  );

  await expectReject(
    "Direct client INSERT into expenses is blocked (RPC-only)",
    ownerA,
    "insert into expenses (company_id, category, amount) values ($1,'Sneaky',1000)",
    [companyA],
  );

  const expY = (
    await asUser<{ id: string }>(
      ownerA,
      "select (save_expense($1::jsonb))->>'id' as id",
      [JSON.stringify({ category: "Misc", amount: 50000 })],
    )
  ).rows[0].id;
  await asUser(ownerA, "select archive_expense($1)", [expY]);

  const archived = (
    await client.query("select deleted_at from expenses where id=$1", [expY])
  ).rows[0];
  check("archive_expense soft-deletes (row kept, deleted_at set)", archived.deleted_at !== null);

  const liveY = await asUser(
    ownerA,
    "select id from expenses where id=$1 and deleted_at is null",
    [expY],
  );
  check("Archived expense is excluded from live reads", liveY.rowCount === 0);

  const expAudit = (
    await client.query(
      "select count(*)::int n from audit_logs where entity_id=$1 and action in ('expense.created','expense.archived')",
      [expY],
    )
  ).rows[0].n;
  check("Expense create + archive are both audit-logged", expAudit === 2);

  await expectReject(
    "Staff CANNOT archive an expense",
    staffA,
    "select archive_expense($1)",
    [expY],
  );

  // =========================================================================
  console.log("\n[21] Analytics tables are tenant-isolated");
  // =========================================================================
  const bSeesAExpenses = await asUser(
    ownerB,
    "select count(*)::int n from expenses where company_id=$1",
    [companyA],
  );
  const bSeesAMetrics = await asUser(
    ownerB,
    "select count(*)::int n from daily_metrics where company_id=$1",
    [companyA],
  );
  const aSeesExpenses = await asUser(ownerA, "select id from expenses where deleted_at is null");
  const aSeesMetrics = await asUser(ownerA, "select id from daily_metrics");
  check("B sees ZERO of A's expenses", Number(bSeesAExpenses.rows[0].n) === 0);
  check("B sees ZERO of A's daily_metrics", Number(bSeesAMetrics.rows[0].n) === 0);
  check("A can see its own expenses", aSeesExpenses.rowCount > 0);
  check("A can see its own daily_metrics", aSeesMetrics.rowCount > 0);

  // =========================================================================
  console.log("\n[22] AI assistant (Phase 6): tenant + per-user memory isolation");
  // =========================================================================
  // Owner A starts a private chat, logs a turn, and records token spend.
  const convA = (
    await asUser<{ id: string }>(
      ownerA,
      "insert into ai_conversations (company_id, user_id, title) values ($1,$2,'A chat') returning id",
      [companyA, ownerA],
    )
  ).rows[0].id;
  await asUser(
    ownerA,
    "insert into ai_messages (company_id, user_id, conversation_id, role, content) values ($1,$2,$3,'user','hi')",
    [companyA, ownerA, convA],
  );
  await asUser(
    ownerA,
    "insert into ai_usage (company_id, user_id, conversation_id, model, input_tokens, output_tokens, cost_usd_cents) values ($1,$2,$3,'claude-opus-4-8',10,5,123)",
    [companyA, ownerA, convA],
  );
  // Insights are service-role-written; seed one per company.
  await client.query(
    "insert into ai_insights (company_id, kind, severity, title, body) values ($1,'low_stock','warning','A low','body'),($2,'low_stock','warning','B low','body')",
    [companyA, companyB],
  );

  const bSeesAConvos = await asUser(ownerB, "select count(*)::int n from ai_conversations where company_id=$1", [companyA]);
  const staffSeesOwnerConvos = await asUser(staffA, "select id from ai_conversations");
  const ownerSeesOwnConvos = await asUser(ownerA, "select id from ai_conversations");
  const bSeesAMessages = await asUser(ownerB, "select count(*)::int n from ai_messages where company_id=$1", [companyA]);
  const bSeesAUsage = await asUser(ownerB, "select count(*)::int n from ai_usage where company_id=$1", [companyA]);
  const bSeesAInsights = await asUser(ownerB, "select count(*)::int n from ai_insights where company_id=$1", [companyA]);
  const bSeesOwnInsights = await asUser(ownerB, "select id from ai_insights");
  check("B sees ZERO of A's AI conversations", Number(bSeesAConvos.rows[0].n) === 0);
  check("Staff CANNOT see another user's chats (per-user memory)", staffSeesOwnerConvos.rowCount === 0);
  check("Owner A sees its own chat", ownerSeesOwnConvos.rowCount >= 1);
  check("B sees ZERO of A's AI messages", Number(bSeesAMessages.rows[0].n) === 0);
  check("B sees ZERO of A's AI usage", Number(bSeesAUsage.rows[0].n) === 0);
  check("B sees ZERO of A's AI insights", Number(bSeesAInsights.rows[0].n) === 0);
  check("B sees only its own insight", bSeesOwnInsights.rowCount === 1);

  await expectReject(
    "A user CANNOT log usage under another user's id",
    staffA,
    "insert into ai_usage (company_id, user_id, model, cost_usd_cents) values ($1,$2,'m',1)",
    [companyA, ownerA],
  );

  // =========================================================================
  console.log("\n[23] AI settings role gating + spend log/cap");
  // =========================================================================
  await expectReject(
    "Staff CANNOT change AI settings (owner only)",
    staffA,
    "select save_ai_settings(true, 5000)",
    [],
  );
  await asUser(ownerA, "select save_ai_settings(false, 5000)");
  const capRow = (
    await client.query(
      "select enabled, monthly_cap_usd_cents from ai_settings where company_id=$1",
      [companyA],
    )
  ).rows[0];
  check("Owner can save AI settings (enabled flag + cap persisted)", capRow.enabled === false && Number(capRow.monthly_cap_usd_cents) === 5000);
  const settingsAudit = (
    await client.query("select count(*)::int n from audit_logs where action='ai.settings_updated' and company_id=$1", [companyA])
  ).rows[0].n;
  check("AI settings change is audit-logged", settingsAudit >= 1);

  // Spend log: owner B records a turn for company B; each company's month
  // spend counts only its own usage.
  const convB = (
    await asUser<{ id: string }>(
      ownerB,
      "insert into ai_conversations (company_id, user_id, title) values ($1,$2,'B chat') returning id",
      [companyB, ownerB],
    )
  ).rows[0].id;
  await asUser(
    ownerB,
    "insert into ai_usage (company_id, user_id, conversation_id, model, cost_usd_cents) values ($1,$2,$3,'claude-opus-4-8',999)",
    [companyB, ownerB, convB],
  );
  const aMonth = (await asUser<{ n: string }>(ownerA, "select ai_month_usd_cents() as n")).rows[0].n;
  const bMonth = (await asUser<{ n: string }>(ownerB, "select ai_month_usd_cents() as n")).rows[0].n;
  check("ai_month_usd_cents counts only the caller's company (A = 123)", Number(aMonth) === 123);
  check("ai_month_usd_cents is tenant-scoped (B = 999, not 1122)", Number(bMonth) === 999);

  // =========================================================================
  console.log("\n[24] Phase 3 payments — intents, tenancy, service-role reconcile");
  // =========================================================================
  // A fresh UNPAID sale for Company A to charge online.
  const payInvoice = (
    await asUser<{ r: { invoice: { id: string } } }>(
      ownerA,
      "select record_sale($1::jsonb) as r",
      [
        JSON.stringify({
          customer_id: custA,
          items: [{ description: "Consulting", quantity: 1, unit_price: 20000_00 }],
        }),
      ],
    )
  ).rows[0].r.invoice.id;

  const payIntent = (
    await asUser<{ r: { reference: string; amount: number; status: string } }>(
      ownerA,
      "select create_payment_intent($1::jsonb) as r",
      [JSON.stringify({ invoice_id: payInvoice, provider: "simulated" })],
    )
  ).rows[0].r;
  check(
    "create_payment_intent returns a pending intent for the full balance",
    payIntent.status === "pending" && Number(payIntent.amount) === 20000_00 && !!payIntent.reference,
  );

  // Tenancy: B cannot see A's intents, and cannot open one on A's invoice.
  const bSeesIntents = await asUser(ownerB, "select id from payment_intents");
  check("B sees ZERO of A's payment_intents (RLS)", bSeesIntents.rowCount === 0);
  await expectReject(
    "B CANNOT create a payment intent on A's invoice",
    ownerB,
    "select create_payment_intent($1::jsonb)",
    [JSON.stringify({ invoice_id: payInvoice, provider: "simulated" })],
  );

  // reconcile is service-role only — an authenticated user has no execute grant.
  await expectReject(
    "Authenticated user CANNOT call reconcile_gateway_payment (service-role only)",
    ownerA,
    "select reconcile_gateway_payment($1::jsonb)",
    [JSON.stringify({ reference: payIntent.reference, status: "success", amount: 20000_00 })],
  );

  // Service-role reconcile (raw connection = superuser, bypasses the grant).
  const payRecon = (
    await client.query("select reconcile_gateway_payment($1::jsonb) as r", [
      JSON.stringify({
        reference: payIntent.reference,
        provider_reference: "SIM_TEST_1",
        amount: 20000_00,
        status: "success",
        method: "transfer",
      }),
    ])
  ).rows[0].r as { reconciled?: boolean };
  check("reconcile_gateway_payment records the payment (reconciled=true)", payRecon.reconciled === true);

  const payInvStatus = (
    await client.query("select status from invoices where id=$1", [payInvoice])
  ).rows[0].status as string;
  check("Invoice flips to 'paid' after reconciliation", payInvStatus === "paid");

  const payIntentStatus = (
    await client.query("select status from payment_intents where reference=$1", [payIntent.reference])
  ).rows[0].status as string;
  check("Payment intent flips to 'success'", payIntentStatus === "success");

  // Idempotency: a duplicate webhook must NOT double-record.
  const payRecon2 = (
    await client.query("select reconcile_gateway_payment($1::jsonb) as r", [
      JSON.stringify({ reference: payIntent.reference, status: "success", amount: 20000_00 }),
    ])
  ).rows[0].r as { already_reconciled?: boolean };
  const payPaymentCount = Number(
    (await client.query("select count(*)::int n from payments where invoice_id=$1", [payInvoice])).rows[0].n,
  );
  check(
    "Duplicate webhook is idempotent (already_reconciled, exactly 1 payment)",
    payRecon2.already_reconciled === true && payPaymentCount === 1,
  );

  // =========================================================================
  console.log("\n[25] Offline idempotency — replayed sale returns the same invoice");
  // =========================================================================
  const clientUuid = randomUUID();
  const salePayload = JSON.stringify({
    customer_id: custA,
    client_uuid: clientUuid,
    items: [{ description: "Offline sale", quantity: 1, unit_price: 7500_00 }],
    payment: { amount: 7500_00, method: "cash" },
  });
  const firstSale = (
    await asUser<{ r: { invoice: { id: string }; idempotent_replay?: boolean } }>(
      ownerA,
      "select record_sale($1::jsonb) as r",
      [salePayload],
    )
  ).rows[0].r;
  const replaySale = (
    await asUser<{ r: { invoice: { id: string }; idempotent_replay?: boolean } }>(
      ownerA,
      "select record_sale($1::jsonb) as r",
      [salePayload],
    )
  ).rows[0].r;
  check(
    "Replaying a sale with the same client_uuid returns the SAME invoice (no dup)",
    firstSale.invoice.id === replaySale.invoice.id && replaySale.idempotent_replay === true,
  );
  const dupCount = Number(
    (await client.query("select count(*)::int n from invoices where client_uuid=$1", [clientUuid]))
      .rows[0].n,
  );
  check("Exactly ONE invoice exists for the offline client_uuid", dupCount === 1);

  // =========================================================================
  console.log("\n[26] Copilot actions — per-user scoping + decision gating");
  // =========================================================================
  const proposal = (
    await asUser<{ r: { id: string; status: string } }>(
      ownerA,
      "select propose_ai_action($1,$2::jsonb,$3,$4) as r",
      ["send_receipt", JSON.stringify({ invoice_id: payInvoice }), "Send the receipt for INV", null],
    )
  ).rows[0].r;
  check("propose_ai_action creates a pending proposal", proposal.status === "pending");

  const bSeesActions = await asUser(ownerB, "select id from ai_actions");
  check("B sees ZERO of A's copilot actions (tenant isolation)", bSeesActions.rowCount === 0);

  const staffSeesActions = await asUser(staffA, "select id from ai_actions");
  check("Another USER in the same company sees ZERO (per-user scoping)", staffSeesActions.rowCount === 0);

  await expectReject(
    "A different user CANNOT decide someone else's proposed action",
    staffA,
    "select set_ai_action_status($1,'approved',null)",
    [proposal.id],
  );

  // --- summary ---------------------------------------------------------------
  console.log(`\n${"=".repeat(60)}`);
  if (failures.length === 0) {
    console.log(`ALL ${passed} CHECKS PASSED — two-company RLS isolation holds.`);
  } else {
    console.log(`${passed} passed, ${failures.length} FAILED:`);
    for (const f of failures) console.log(`  - ${f}`);
  }
  console.log("=".repeat(60));

  await client.end();
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error("\nRLS test crashed:", e);
  try {
    await client.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
