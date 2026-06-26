import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/modules/auth/session";
import {
  listExpenseCategories,
  listExpenses,
  getExpenseMetrics,
} from "@/modules/analytics/queries";
import type { Branch } from "@/modules/shared/types";
import { ExpensesClient } from "./expenses-client";

function canManageExpenses(role: string) {
  return role === "owner" || role === "manager" || role === "accountant";
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: {
    page?: string;
    category?: string;
    from?: string;
    to?: string;
  };
}) {
  const { profile } = await requireSession();
  const page = Number(searchParams.page ?? "1");
  const supabase = createClient();
  const [expenses, categories, metrics, { data: branches }] = await Promise.all([
    listExpenses({
      page: Number.isFinite(page) ? page : 1,
      category: searchParams.category || undefined,
      from: searchParams.from,
      to: searchParams.to,
    }),
    listExpenseCategories(),
    getExpenseMetrics(),
    supabase
      .from("branches")
      .select("*")
      .order("is_primary", { ascending: false })
      .order("name"),
  ]);

  return (
    <ExpensesClient
      expenses={expenses}
      categories={categories}
      metrics={metrics}
      branches={(branches as Branch[] | null) ?? []}
      canManage={canManageExpenses(profile.role)}
      filters={{
        category: searchParams.category ?? "",
        from: searchParams.from ?? "",
        to: searchParams.to ?? "",
      }}
    />
  );
}
