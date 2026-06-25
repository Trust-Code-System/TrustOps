/**
 * Background worker entrypoint. Runs scheduled + event-driven jobs and dispatches
 * notifications. Deploy as a separate long-running process (a worker host); in
 * production it can be replaced by BullMQ/pg_cron behind the same jobs module.
 *
 *   npm run worker            # uses env from .env.local (tsx --env-file)
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */
import { startWorker } from "@/modules/jobs/worker";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing env: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY " +
      "(e.g. in .env.local; the npm script loads it via --env-file).",
  );
  process.exit(1);
}

void startWorker();
