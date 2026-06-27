"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Sparkles } from "lucide-react";
import { approveAiAction, rejectAiAction } from "@/modules/ai/action-runner";
import { useToast } from "@/components/ui/toast";
import type { AiAction } from "@/modules/shared/types";

/**
 * Pending copilot proposals. The assistant proposes; the user decides here.
 * Approving runs the action through the real, RLS-scoped server actions.
 */
export function PendingActions({ actions }: { actions: AiAction[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (actions.length === 0) return null;

  async function approve(a: AiAction) {
    setBusyId(a.id);
    const res = await approveAiAction(a.id);
    setBusyId(null);
    if (res.ok) {
      toast(res.message, "success");
      if (res.url) window.open(res.url, "_blank", "noopener");
    } else {
      toast(res.error, "error");
    }
    router.refresh();
  }

  async function reject(a: AiAction) {
    setBusyId(a.id);
    await rejectAiAction(a.id);
    setBusyId(null);
    router.refresh();
  }

  return (
    <div className="mb-3 space-y-2">
      {actions.map((a) => (
        <div
          key={a.id}
          className="flex items-start gap-3 rounded-lg border border-primary-200 bg-primary-50 p-3"
        >
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-600 text-text-on-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-small text-text-muted">Approval needed</p>
            <p className="text-body text-text-primary">{a.summary}</p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={() => approve(a)}
              disabled={busyId === a.id}
              className="inline-flex h-8 items-center gap-1 rounded-md bg-primary-600 px-3 text-small text-text-on-primary hover:bg-primary-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> Approve
            </button>
            <button
              type="button"
              onClick={() => reject(a)}
              disabled={busyId === a.id}
              aria-label="Reject"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-default text-text-secondary hover:bg-surface-card disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
