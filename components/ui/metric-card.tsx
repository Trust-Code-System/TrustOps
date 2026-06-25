import * as React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Metric / KPI card — design system §3.6.
 * Caption label, big neutral metric value (a fact, never colored), and an
 * OPTIONAL delta line — the only place trend color appears on the dashboard.
 */
export interface MetricCardProps {
  label: string;
  /** Pre-formatted value (e.g. ₦ from <Money>, or a plain count). */
  value: React.ReactNode;
  delta?: {
    direction: "up" | "down";
    text: string;
  };
  className?: string;
}

export function MetricCard({ label, value, delta, className }: MetricCardProps) {
  const DeltaIcon = delta?.direction === "down" ? ArrowDownRight : ArrowUpRight;

  return (
    <Card className={cn("p-4 sm:p-6", className)}>
      <p className="text-caption font-[500] uppercase tracking-[0.04em] text-text-muted">
        {label}
      </p>
      <p className="mt-2 text-metric tabular text-text-primary">{value}</p>
      {delta && (
        <p
          className={cn(
            "mt-2 inline-flex items-center gap-1 text-small",
            delta.direction === "up" ? "text-success-500" : "text-danger-500",
          )}
        >
          <DeltaIcon className="h-4 w-4" aria-hidden="true" />
          {delta.text}
        </p>
      )}
    </Card>
  );
}
