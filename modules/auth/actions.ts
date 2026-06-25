"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  signupSchema,
  acceptInviteSchema,
  type ActionState,
} from "./schemas";

function zodFieldErrors(error: import("zod").ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}

/** Sign the current user out and return to login. */
export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Email/password login. */
export async function login(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error) };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "That email and password don't match an account" };
  }

  redirect("/dashboard");
}

/**
 * Sign up: creates a company + the first user as `owner` in one flow.
 *
 * The auth user is created via Supabase Auth (the user's own session). The
 * company, its primary branch, and the owner profile are created atomically by
 * the `bootstrap_company` SECURITY DEFINER RPC — so the row-creating logic lives
 * in the database, runs as the new user, and never bypasses tenancy.
 *
 * NOTE: requires email confirmation to be DISABLED for the project so sign-up
 * returns a session and lands on the dashboard (see README setup).
 */
export async function signupCompany(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    companyName: formData.get("companyName"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error) };
  }
  const { companyName, fullName, email, password } = parsed.data;

  const supabase = createClient();
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (signUpError) {
    if (signUpError.message.toLowerCase().includes("already")) {
      return { error: "An account with this email already exists" };
    }
    return { error: "Could not create your account. Please try again." };
  }

  if (!signUpData.session) {
    // Email confirmation is on: the user must confirm before we can bootstrap.
    return {
      error:
        "Check your email to confirm your account, then sign in to finish setup.",
    };
  }

  const { error: rpcError } = await supabase.rpc("bootstrap_company", {
    p_company_name: companyName,
    p_full_name: fullName,
  });
  if (rpcError) {
    return { error: "Could not set up your company. Please try again." };
  }

  redirect("/dashboard");
}

/**
 * Accept invite: an invited user (profile already created by the inviter) sets
 * their password to activate their account, then joins their assigned company.
 * The invite link establishes a session before this runs.
 */
export async function acceptInvite(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = acceptInviteSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error) };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: "This invite link has expired. Ask your admin to resend it.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return { error: "Could not set your password. Please try again." };
  }

  redirect("/dashboard");
}
