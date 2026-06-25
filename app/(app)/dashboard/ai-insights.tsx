import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listInsights } from "@/modules/ai/queries";
import type { AiInsightSeverity } from "@/modules/shared/types";

const TONE: Record<AiInsightSeverity, "success" | "warning" | "danger" | "neutral"> = {
  positive: "success",
  warning: "warning",
  danger: "danger",
  neutral: "neutral",
};

/**
 * Proactive insights — rule-based cards computed by the Phase 4 job over Phase 5
 * aggregates. Each card is grounded (the figures trace to a query); the footer
 * is the "why am I seeing this" transparency the spec asks for.
 */
export async function AiInsights() {
  const insights = await listInsights();
  if (insights.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary-600" aria-hidden="true" />
            Insights
          </span>
        </CardTitle>
        <Link href="/assistant" className="text-small font-[600] text-primary-600">
          Ask the assistant
        </Link>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {insights.map((i) => (
          <div
            key={i.id}
            className="rounded-md border border-border-subtle p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-body-strong text-text-primary">{i.title}</p>
              <Badge tone={TONE[i.severity]}>{i.severity}</Badge>
            </div>
            <p className="mt-1 text-small text-text-secondary">{i.body}</p>
          </div>
        ))}
        <p className="text-caption text-text-muted sm:col-span-2">
          Generated daily from your sales, stock, and invoices.
        </p>
      </CardContent>
    </Card>
  );
}
