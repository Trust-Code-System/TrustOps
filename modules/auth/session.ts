import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/modules/shared/types";

export interface SessionContext {
  userId: string;
  email: string | null;
  profile: Profile;
}

/**
 * Resolve the current user + their profile (which carries company_id and role).
 * Returns null if not authenticated or no profile yet.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: profile as Profile,
  };
}

/** Require an authenticated session with a profile, or redirect to login. */
export async function requireSession(): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  return ctx;
}

/** Roles allowed to manage staff, branches, and roles. */
export const ADMIN_ROLES = ["owner", "manager"] as const;

export function canManageOrg(role: Profile["role"]): boolean {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}
