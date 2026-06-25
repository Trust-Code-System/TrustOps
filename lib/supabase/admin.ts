import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Admin Supabase client using the service-role key. BYPASSES RLS.
 *
 * Use ONLY for narrow, trusted server-side operations that genuinely cannot run
 * as a user — e.g. creating the company + first owner during sign-up (before a
 * profile/session exists), or admin-inviting a user. Never expose to the client,
 * never use it to serve user-scoped reads. Every use must scope by company_id
 * explicitly because the database will not.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
