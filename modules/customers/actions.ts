"use server";

import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext, canManageOrg } from "@/modules/auth/session";
import type { ActionState } from "@/modules/auth/schemas";
import { customerSchema } from "./schemas";

function fieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const k = i.path[0];
    if (typeof k === "string" && !out[k]) out[k] = i.message;
  }
  return out;
}

/** Create or update a customer. Any company member may add/edit. */
export async function saveCustomer(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Your session has expired. Log in again." };

  const parsed = customerSchema.safeParse({
    id: formData.get("id") || undefined,
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = createClient();
  const row = {
    full_name: parsed.data.fullName,
    phone: parsed.data.phone,
    email: parsed.data.email,
    notes: parsed.data.notes,
  };

  let error;
  if (parsed.data.id) {
    ({ error } = await supabase
      .from("customers")
      .update(row)
      .eq("id", parsed.data.id));
  } else {
    ({ error } = await supabase
      .from("customers")
      .insert({ ...row, company_id: ctx.profile.company_id }));
  }

  if (error) {
    // Unique (company_id, phone) violation — specific, fixable message.
    if (error.code === "23505") {
      return { fieldErrors: { phone: "This phone number is already on a customer" } };
    }
    return { error: "Could not save the customer" };
  }

  revalidatePath("/customers");
  return { ok: true };
}

/**
 * Archive a customer (soft delete). Org admins only — "staff can record
 * customers but not delete" — and the RLS WITH CHECK enforces this at the DB
 * level too.
 */
export async function archiveCustomer(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Your session has expired. Log in again." };
  if (!canManageOrg(ctx.profile.role)) {
    return { error: "Only an owner or manager can archive customers" };
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Invalid request" };

  const supabase = createClient();
  const { error } = await supabase
    .from("customers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: "Could not archive the customer" };

  revalidatePath("/customers");
  return { ok: true };
}
