"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/modules/auth/session";
import type { Expense } from "@/modules/shared/types";
import {
  archiveExpenseSchema,
  expenseSchema,
  type ExpenseInput,
} from "./schemas";

type Result<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

function revalidateAnalytics() {
  revalidatePath("/expenses");
  revalidatePath("/analytics");
  revalidatePath("/reports");
}

export async function saveExpense(
  input: ExpenseInput,
): Promise<Result<{ expense: Expense }>> {
  const ctx = await getSessionContext();
  if (!ctx) return { ok: false, error: "Your session has expired. Log in again." };

  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid expense",
    };
  }

  const d = parsed.data;
  const supabase = createClient();
  const { data, error } = await supabase.rpc("save_expense", {
    p_payload: {
      id: d.id ?? null,
      branch_id: d.branchId ?? null,
      category: d.category,
      amount: d.amount,
      description: d.description ?? null,
      spent_at: d.spentAt,
    },
  });

  if (error) return { ok: false, error: error.message };

  revalidateAnalytics();
  return { ok: true, data: { expense: data as Expense } };
}

export async function archiveExpense(id: string): Promise<Result> {
  const ctx = await getSessionContext();
  if (!ctx) return { ok: false, error: "Your session has expired. Log in again." };

  const parsed = archiveExpenseSchema.safeParse({ id });
  if (!parsed.success) return { ok: false, error: "Invalid expense" };

  const supabase = createClient();
  const { error } = await supabase.rpc("archive_expense", {
    p_expense_id: parsed.data.id,
  });
  if (error) return { ok: false, error: error.message };

  revalidateAnalytics();
  return { ok: true };
}
