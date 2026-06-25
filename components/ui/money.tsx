import * as React from "react";
import { formatNaira } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Money display — design system §1.1 money color rule.
 *
 * Always tabular-aligned and ₦-formatted. Color carries meaning, never
 * decoration, so it is OPT-IN via `tone`:
 *   - "neutral" (default): a plain fact (a total, a KPI number) — text-primary.
 *   - "positive": money-positive (paid, revenue up) — success-500.
 *   - "negative": money-negative (unpaid, owed, down) — danger-500.
 * Pick the tone from what the number MEANS, not from its sign.
 */
export interface MoneyProps extends React.HTMLAttributes<HTMLSpanElement> {
  kobo: number;
  tone?: "neutral" | "positive" | "negative";
  withSymbol?: boolean;
}

export function Money({
  kobo,
  tone = "neutral",
  withSymbol = true,
  className,
  ...props
}: MoneyProps) {
  return (
    <span
      className={cn(
        "tabular",
        tone === "positive" && "text-success-500",
        tone === "negative" && "text-danger-500",
        className,
      )}
      {...props}
    >
      {formatNaira(kobo, { withSymbol })}
    </span>
  );
}
