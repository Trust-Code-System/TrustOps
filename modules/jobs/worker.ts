import "server-only";

import { deliverNotification } from "@/modules/messaging";
import {
  claimJob,
  completeJob,
  failJob,
  requeueStuckJobs,
  tickScheduler,
  claimDueNotifications,
  markNotificationResult,
} from "./queue";
import { runHandler } from "./handlers";

/**
 * One worker pass:
 *  1. requeue jobs orphaned by a crashed worker (visibility timeout)
 *  2. enqueue any due scheduled jobs
 *  3. drain ready jobs (handlers are idempotent; failures retry/dead-letter)
 *  4. dispatch due notifications via the messaging provider (retry/dead-letter)
 */
export async function runWorkerOnce(workerId: string): Promise<{
  jobs: number;
  notifications: number;
}> {
  await requeueStuckJobs();
  await tickScheduler();

  let jobs = 0;
  for (let i = 0; i < 100; i++) {
    const job = await claimJob(workerId);
    if (!job) break;
    try {
      await runHandler(job);
      await completeJob(job.id);
    } catch (e) {
      await failJob(job.id, e instanceof Error ? e.message : "handler error");
    }
    jobs++;
  }

  let notifications = 0;
  const due = await claimDueNotifications(50);
  for (const n of due) {
    try {
      const result = await deliverNotification(n);
      await markNotificationResult(n.id, result.ok, result.error);
    } catch (e) {
      await markNotificationResult(
        n.id,
        false,
        e instanceof Error ? e.message : "delivery error",
      );
    }
    notifications++;
  }

  return { jobs, notifications };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Long-running poll loop. Stops on SIGINT/SIGTERM. */
export async function startWorker(intervalMs = 5000): Promise<void> {
  const workerId = `worker-${process.pid}`;
  let running = true;
  const stop = () => {
    running = false;
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  console.info(`[worker] started (${workerId}), polling every ${intervalMs}ms`);
  while (running) {
    try {
      const { jobs, notifications } = await runWorkerOnce(workerId);
      if (jobs || notifications) {
        console.info(`[worker] processed ${jobs} job(s), ${notifications} notification(s)`);
      }
    } catch (e) {
      console.error("[worker] pass failed:", e);
    }
    await sleep(intervalMs);
  }
  console.info("[worker] stopped");
}
