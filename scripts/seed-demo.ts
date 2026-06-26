/**
 * Seed a demo account for testing the site.
 *
 * Mirrors the real sign-up path exactly: the admin (service-role) client creates
 * a confirmed auth user, then we sign in AS that user and call the
 * `bootstrap_company` RPC — so the company, primary branch, and owner profile
 * are created by the same SECURITY DEFINER path production uses (never a raw
 * RLS-bypassing insert). A handful of products and customers are added so the
 * dashboard isn't empty.
 *
 * Idempotent: safe to re-run. If the user or its company already exist, those
 * steps are skipped rather than erroring.
 *
 * Run: npm run seed:demo
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// ── Demo credentials ────────────────────────────────────────────────────────
const DEMO_EMAIL = "demo@trustops.app";
const DEMO_PASSWORD = "DemoPass123!";
const COMPANY_NAME = "Demo Company";
const OWNER_NAME = "Demo Owner";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SERVICE) {
  console.error(
    "Missing env. Need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const naira = (n: number) => n * 100; // prices are stored in kobo (bigint)

/** Find an existing auth user by email (admin listUsers has no getByEmail). */
async function findUserId(admin: SupabaseClient): Promise<string | null> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === DEMO_EMAIL);
    if (hit) return hit.id;
    if (data.users.length < 200) break; // last page
  }
  return null;
}

async function main() {
  const admin = createClient<Database>(URL!, SERVICE!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Create the confirmed auth user (or reuse the existing one).
  let userId: string | null = null;
  const created = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: OWNER_NAME },
  });
  if (created.error) {
    if (/already|registered|exists/i.test(created.error.message)) {
      userId = await findUserId(admin);
      console.log("• Auth user already exists — reusing it.");
    } else {
      throw created.error;
    }
  } else {
    userId = created.data.user.id;
    console.log("✓ Created auth user.");
  }
  if (!userId) throw new Error("Could not resolve the demo user id.");

  // 2. Sign in AS the user, then bootstrap the company via the real RPC.
  const user = createClient<Database>(URL!, ANON!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signIn = await user.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });
  if (signIn.error) throw signIn.error;

  const { error: rpcError } = await user.rpc("bootstrap_company", {
    p_company_name: COMPANY_NAME,
    p_full_name: OWNER_NAME,
  });
  if (rpcError) {
    if (/already belongs to a company/i.test(rpcError.message)) {
      console.log("• Company already bootstrapped — skipping.");
    } else {
      throw rpcError;
    }
  } else {
    console.log("✓ Bootstrapped company + owner profile.");
  }

  // 3. Resolve company + primary branch from the owner's own profile (RLS-OK).
  const { data: profile, error: profErr } = await user
    .from("profiles")
    .select("company_id, branch_id")
    .eq("id", userId)
    .single();
  if (profErr) throw profErr;
  const companyId = profile.company_id;
  const branchId = profile.branch_id;

  // 4. Sample products via the create_product RPC (the sanctioned write path —
  //    it also seeds inventory + a stock movement). Only if none exist yet.
  const { count: productCount } = await user
    .from("products")
    .select("id", { count: "exact", head: true });
  if (!productCount) {
    const seedProducts = [
      { name: "Bag of Rice (50kg)", category: "Groceries", cost_price: naira(48000), sell_price: naira(55000), qty: 40 },
      { name: "Cooking Gas (12.5kg)", category: "Energy", cost_price: naira(12000), sell_price: naira(14500), qty: 25 },
      { name: "Bottled Water (Carton)", category: "Drinks", cost_price: naira(1200), sell_price: naira(1800), qty: 120 },
      { name: "Detergent (1kg)", category: "Household", cost_price: naira(900), sell_price: naira(1500), qty: 60 },
    ];
    for (const p of seedProducts) {
      const { error } = await user.rpc("create_product", {
        p_payload: {
          name: p.name,
          category: p.category,
          cost_price: p.cost_price,
          sell_price: p.sell_price,
          initial_stock: branchId
            ? [{ branch_id: branchId, quantity: p.qty, low_stock_threshold: 10 }]
            : [],
        },
      });
      if (error) throw error;
    }
    console.log(`✓ Added ${seedProducts.length} sample products (with stock).`);
  } else {
    console.log("• Products already present — skipping.");
  }

  // 5. Sample customers (only if none exist yet).
  const { count: customerCount } = await user
    .from("customers")
    .select("id", { count: "exact", head: true });
  if (!customerCount) {
    const { error } = await user.from("customers").insert([
      { company_id: companyId, full_name: "Amara Okeke", phone: "08030000001", email: "amara@example.com" },
      { company_id: companyId, full_name: "Chidi Balogun", phone: "08030000002" },
      { company_id: companyId, full_name: "Ngozi Adeyemi", phone: "08030000003", email: "ngozi@example.com" },
    ]);
    if (error) throw error;
    console.log("✓ Added 3 sample customers.");
  } else {
    console.log("• Customers already present — skipping.");
  }

  // ── Sales, expenses, and the analytics rollup ─────────────────────────────
  // record_sale always stamps issued_at = now(), so we record real sales via the
  // RPC (atomic, decrements stock) and then backdate issued_at / paid_at with the
  // admin client to spread them across the last 30 days — giving the trend charts
  // real history. Finally aggregate_daily_metrics() rebuilds the cached rollup.
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const dayMs = 24 * 60 * 60 * 1000;
  const WINDOW = 30;

  // 6. Sample sales (only if none exist yet, so re-runs don't drain stock).
  const { count: invoiceCount } = await user
    .from("invoices")
    .select("id", { count: "exact", head: true });
  if (!invoiceCount && branchId) {
    const { data: prods } = await user
      .from("products")
      .select("id, name, sell_price")
      .order("name");
    const { data: custs } = await user
      .from("customers")
      .select("id")
      .order("created_at");

    if (prods?.length && custs?.length) {
      const SALES = 26;
      const backdates: { id: string; iso: string; paid: boolean }[] = [];

      for (let i = 0; i < SALES; i++) {
        // Round-robin products (qty 1, doubled for high-stock lines) keeps every
        // product comfortably within its seeded stock — no "out of stock" raise.
        const prod = prods[i % prods.length];
        const highStock = /water|detergent/i.test(prod.name);
        const qty = highStock ? 1 + (i % 2) : 1;
        const customer = custs[i % custs.length];

        const items: Record<string, unknown>[] = [
          { product_id: prod.id, description: prod.name, quantity: qty, unit_price: prod.sell_price },
        ];
        if (i % 5 === 0) {
          items.push({ description: "Delivery fee", quantity: 1, unit_price: naira(500) });
        }
        const subtotal = items.reduce(
          (s, it) => s + (it.quantity as number) * (it.unit_price as number),
          0,
        );

        // Payment mix (deterministic): ~70% paid in full, ~20% partial, ~10% unpaid.
        const roll = (i * 7 + 3) % 10;
        let payment: Record<string, unknown> | undefined;
        if (roll < 7) payment = { amount: subtotal, method: "cash" };
        else if (roll < 9) payment = { amount: Math.floor(subtotal / 2), method: "transfer" };

        const { data: res, error } = await user.rpc("record_sale", {
          p_payload: {
            customer_id: customer.id,
            branch_id: branchId,
            items,
            ...(payment ? { payment } : {}),
          },
        });
        if (error) throw error;

        const invoiceId = (res as { invoice: { id: string } }).invoice.id;
        const dayOffset = Math.floor((i / SALES) * WINDOW); // spread 0..29 days back
        const iso = new Date(today.getTime() - dayOffset * dayMs).toISOString();
        backdates.push({ id: invoiceId, iso, paid: Boolean(payment) });
      }

      // Backdate via admin (service role) so the dates land in the past.
      for (const b of backdates) {
        await admin.from("invoices").update({ issued_at: b.iso }).eq("id", b.id);
        if (b.paid) {
          await admin.from("payments").update({ paid_at: b.iso }).eq("invoice_id", b.id);
        }
      }
      console.log(`✓ Recorded ${SALES} sales across the last ${WINDOW} days.`);
    }
  } else {
    console.log("• Sales already present — skipping.");
  }

  // 7. Sample expenses (save_expense accepts spent_at, so no backdating needed).
  const { count: expenseCount } = await user
    .from("expenses")
    .select("id", { count: "exact", head: true });
  if (!expenseCount) {
    const expenses = [
      { category: "Rent", amount: naira(80000), description: "Shop rent", daysAgo: 24 },
      { category: "Transport", amount: naira(12000), description: "Deliveries", daysAgo: 18 },
      { category: "Utilities", amount: naira(9500), description: "Electricity (NEPA)", daysAgo: 12 },
      { category: "Supplies", amount: naira(6000), description: "Packaging bags", daysAgo: 7 },
      { category: "Transport", amount: naira(8000), description: "Fuel", daysAgo: 3 },
    ];
    for (const e of expenses) {
      const iso = new Date(today.getTime() - e.daysAgo * dayMs).toISOString();
      const { error } = await user.rpc("save_expense", {
        p_payload: {
          category: e.category,
          amount: e.amount,
          description: e.description,
          branch_id: branchId,
          spent_at: iso,
        },
      });
      if (error) throw error;
    }
    console.log(`✓ Added ${expenses.length} sample expenses.`);
  } else {
    console.log("• Expenses already present — skipping.");
  }

  // 8. Rebuild the analytics rollup over the whole window (service-role only).
  const from = new Date(today.getTime() - WINDOW * dayMs).toISOString().slice(0, 10);
  const to = today.toISOString().slice(0, 10);
  const { error: aggError } = await admin.rpc("aggregate_daily_metrics", {
    p_from: from,
    p_to: to,
  });
  if (aggError) throw aggError;
  console.log("✓ Rebuilt daily analytics rollup.");

  await user.auth.signOut();

  console.log("\n──────────────────────────────────────────");
  console.log("  Demo login ready:");
  console.log(`    Email:    ${DEMO_EMAIL}`);
  console.log(`    Password: ${DEMO_PASSWORD}`);
  console.log("──────────────────────────────────────────\n");
}

main().catch((err) => {
  console.error("\n✗ Seed failed:", err.message ?? err);
  process.exit(1);
});
