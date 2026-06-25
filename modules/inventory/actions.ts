"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/modules/auth/session";
import type { Product } from "@/modules/shared/types";
import {
  createProductSchema,
  updateProductSchema,
  adjustStockSchema,
  transferStockSchema,
  type CreateProductInput,
  type UpdateProductInput,
  type AdjustStockInput,
  type TransferStockInput,
} from "./schemas";

type Result<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

function skuTaken(error: { code?: string; message?: string }): boolean {
  return error.code === "23505";
}

export async function createProduct(
  input: CreateProductInput,
): Promise<Result<{ productId: string }>> {
  const ctx = await getSessionContext();
  if (!ctx) return { ok: false, error: "Your session has expired. Log in again." };

  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid product" };
  }
  const d = parsed.data;

  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_product", {
    p_payload: {
      name: d.name,
      sku: d.sku ?? null,
      category: d.category ?? null,
      unit: d.unit,
      cost_price: d.costPrice,
      sell_price: d.sellPrice,
      initial_stock: d.initialStock.map((s) => ({
        branch_id: s.branchId,
        quantity: s.quantity,
        low_stock_threshold: s.lowStockThreshold,
      })),
    },
  });
  if (error) {
    if (skuTaken(error)) return { ok: false, error: "That SKU is already in use" };
    return { ok: false, error: error.message };
  }

  revalidatePath("/products");
  return { ok: true, data: { productId: (data as Product).id } };
}

export async function updateProduct(input: UpdateProductInput): Promise<Result> {
  const ctx = await getSessionContext();
  if (!ctx) return { ok: false, error: "Your session has expired. Log in again." };

  const parsed = updateProductSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid product" };
  }
  const d = parsed.data;

  const supabase = createClient();
  const { error } = await supabase.rpc("update_product", {
    p_payload: {
      id: d.id,
      name: d.name,
      sku: d.sku ?? null,
      category: d.category ?? null,
      unit: d.unit,
      cost_price: d.costPrice,
      sell_price: d.sellPrice,
      is_active: d.isActive,
    },
  });
  if (error) {
    if (skuTaken(error)) return { ok: false, error: "That SKU is already in use" };
    return { ok: false, error: error.message };
  }

  revalidatePath("/products");
  revalidatePath(`/products/${d.id}`);
  return { ok: true };
}

export async function adjustStock(input: AdjustStockInput): Promise<Result> {
  const ctx = await getSessionContext();
  if (!ctx) return { ok: false, error: "Your session has expired. Log in again." };

  const parsed = adjustStockSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid adjustment" };
  }
  const d = parsed.data;

  const supabase = createClient();
  const { error } = await supabase.rpc("adjust_stock", {
    p_payload: {
      product_id: d.productId,
      branch_id: d.branchId,
      type: d.type,
      quantity_delta: d.quantityDelta,
      reason: d.reason,
      low_stock_threshold: d.lowStockThreshold ?? null,
    },
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/products/${d.productId}`);
  revalidatePath("/products");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function transferStock(input: TransferStockInput): Promise<Result> {
  const ctx = await getSessionContext();
  if (!ctx) return { ok: false, error: "Your session has expired. Log in again." };

  const parsed = transferStockSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid transfer" };
  }
  const d = parsed.data;

  const supabase = createClient();
  const { error } = await supabase.rpc("transfer_stock", {
    p_payload: {
      product_id: d.productId,
      from_branch_id: d.fromBranchId,
      to_branch_id: d.toBranchId,
      quantity: d.quantity,
      reason: d.reason ?? null,
    },
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/products/${d.productId}`);
  revalidatePath("/products");
  return { ok: true };
}
