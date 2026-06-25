import { type NextRequest } from "next/server";
import { runWorkerOnce } from "@/modules/jobs/worker";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Background-jobs tick for serverless (Vercel Cron). Runs ONE worker pass —
 * requeue stuck jobs → tick the scheduler → drain ready jobs → dispatch due
 * notifications — then returns. Schedule it in vercel.json.
 *
 * Security: this runs with the service role (bypasses RLS) and can send
 * messages, so it must never be publicly triggerable. Vercel automatically adds
 * `Authorization: Bearer $CRON_SECRET` to cron requests when CRON_SECRET is set;
 * we require and verify it. Without CRON_SECRET configured, the endpoint refuses
 * to run rather than expose an open trigger.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { ok: false, error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runWorkerOnce("vercel-cron");
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "worker pass failed" },
      { status: 500 },
    );
  }
}
