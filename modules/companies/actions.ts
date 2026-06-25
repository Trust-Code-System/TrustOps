"use server";

import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionContext, canManageOrg } from "@/modules/auth/session";
import type { ActionState } from "@/modules/auth/schemas";
import {
  updateCompanySchema,
  branchSchema,
  inviteStaffSchema,
  updateRoleSchema,
  setActiveSchema,
} from "./schemas";

function fieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const k = i.path[0];
    if (typeof k === "string" && !out[k]) out[k] = i.message;
  }
  return out;
}

/** Resolve an org-admin session, or an error state to return to the form. */
async function requireOrgAdmin() {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Your session has expired. Log in again." } as const;
  if (!canManageOrg(ctx.profile.role)) {
    return { error: "Only an owner or manager can do this" } as const;
  }
  return { ctx } as const;
}

/** Update company profile (name, currency). Org admins only. */
export async function updateCompany(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireOrgAdmin();
  if ("error" in guard) return { error: guard.error };

  const parsed = updateCompanySchema.safeParse({
    name: formData.get("name"),
    currency: formData.get("currency"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = createClient();
  // RLS ensures this only ever targets the caller's own company.
  const { error } = await supabase
    .from("companies")
    .update({ name: parsed.data.name, currency: parsed.data.currency })
    .eq("id", guard.ctx.profile.company_id);
  if (error) return { error: "Could not save company details" };

  revalidatePath("/settings");
  return { ok: true } as ActionState;
}

/** Add or edit a branch. Org admins only. */
export async function saveBranch(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireOrgAdmin();
  if ("error" in guard) return { error: guard.error };

  const parsed = branchSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    isPrimary: formData.get("isPrimary") === "on",
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = createClient();
  const companyId = guard.ctx.profile.company_id;

  // Enforce a single primary branch: clear others first if this one is primary.
  if (parsed.data.isPrimary) {
    await supabase
      .from("branches")
      .update({ is_primary: false })
      .eq("company_id", companyId);
  }

  if (parsed.data.id) {
    const { error } = await supabase
      .from("branches")
      .update({ name: parsed.data.name, is_primary: parsed.data.isPrimary })
      .eq("id", parsed.data.id);
    if (error) return { error: "Could not save the branch" };
  } else {
    const { error } = await supabase
      .from("branches")
      .insert({
        company_id: companyId,
        name: parsed.data.name,
        is_primary: parsed.data.isPrimary,
      });
    if (error) return { error: "Could not add the branch" };
  }

  revalidatePath("/settings");
  return { ok: true } as ActionState;
}

/**
 * Invite a staff member. Org admins only.
 *
 * Uses the admin client at this trusted boundary to create the auth user and
 * send the invite email, then creates their profile in the inviter's company.
 * company_id is set explicitly from the inviter's session — the admin client
 * bypasses RLS, so tenancy is enforced here in code.
 */
export async function inviteStaff(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireOrgAdmin();
  if ("error" in guard) return { error: guard.error };

  const parsed = inviteStaffSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const admin = createAdminClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/accept-invite`;

  const { data: invited, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
      data: { full_name: parsed.data.fullName },
      redirectTo,
    });
  if (inviteError || !invited?.user) {
    if (inviteError?.message?.toLowerCase().includes("already")) {
      return { error: "Someone with this email already has an account" };
    }
    return { error: "Could not send the invite. Check email settings." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: invited.user.id,
    company_id: guard.ctx.profile.company_id,
    full_name: parsed.data.fullName,
    role: parsed.data.role,
    is_active: true,
  });
  if (profileError) {
    return { error: "Invite sent, but setting up their access failed." };
  }

  revalidatePath("/settings");
  return { ok: true } as ActionState;
}

/** Change a staff member's role. Org admins only. */
export async function updateStaffRole(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireOrgAdmin();
  if ("error" in guard) return { error: guard.error };

  const parsed = updateRoleSchema.safeParse({
    profileId: formData.get("profileId"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = createClient();
  // RLS confines this to profiles in the caller's company.
  const { error } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.profileId);
  if (error) return { error: "Could not update their role" };

  revalidatePath("/settings");
  return { ok: true } as ActionState;
}

/** Activate / deactivate a staff member. Org admins only. */
export async function setStaffActive(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireOrgAdmin();
  if ("error" in guard) return { error: guard.error };

  const parsed = setActiveSchema.safeParse({
    profileId: formData.get("profileId"),
    isActive: formData.get("isActive") === "true",
  });
  if (!parsed.success) return { error: "Invalid request" };

  // An owner cannot be deactivated, and you cannot deactivate yourself.
  if (parsed.data.profileId === guard.ctx.profile.id) {
    return { error: "You can't deactivate your own account" };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: parsed.data.isActive })
    .eq("id", parsed.data.profileId)
    .neq("role", "owner");
  if (error) return { error: "Could not update their status" };

  revalidatePath("/settings");
  return { ok: true } as ActionState;
}
