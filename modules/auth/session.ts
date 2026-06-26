import "server-only";

import { notFound, redirect } from "next/navigation";
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

/**
 * Platform admin — the TrustOps operator (you), distinct from a tenant's
 * "owner" role. Identified by email via PLATFORM_ADMIN_EMAILS (comma-separated).
 * This is the only gate on the cross-tenant /admin area and support inbox.
 */
const PLATFORM_ADMIN_EMAILS = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isPlatformAdmin(email: string | null | undefined): boolean {
  if (!email || PLATFORM_ADMIN_EMAILS.length === 0) return false;
  return PLATFORM_ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Require the platform admin, or 404. Uses notFound() (not redirect) so the
 * area's existence isn't revealed to anyone who isn't the operator.
 */
export async function requirePlatformAdmin(): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx || !isPlatformAdmin(ctx.email)) notFound();
  return ctx;
}
