import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/modules/shared/types";

/**
 * Badge / status pill — design system §3.4.
 * Pill shape, caption uppercase. Background semantic-50, text semantic-700.
 * Tone carries meaning; color is never the only signal — the word is always there.
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-caption font-[500] uppercase tracking-[0.04em]",
  {
    variants: {
      tone: {
        neutral: "bg-gray-100 text-gray-700",
        success: "bg-success-50 text-success-700",
        danger: "bg-danger-50 text-danger-700",
        warning: "bg-warning-50 text-warning-700",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

const INVOICE_STATUS_MAP: Record<
  InvoiceStatus,
  { tone: NonNullable<BadgeProps["tone"]>; label: string }
> = {
  draft: { tone: "neutral", label: "Draft" },
  unpaid: { tone: "danger", label: "Unpaid" },
  partial: { tone: "warning", label: "Partial" },
  paid: { tone: "success", label: "Paid" },
  overdue: { tone: "danger", label: "Overdue" },
  archived: { tone: "neutral", label: "Archived" },
};

/** Invoice status pill that always shows the word, colored by the money rule. */
export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const { tone, label } = INVOICE_STATUS_MAP[status];
  return <Badge tone={tone}>{label}</Badge>;
}

/**
 * Stock status pill — design system §3.4 (In stock / Low stock / Out of stock).
 * The word is always shown; color is never the only signal.
 */
export function StockBadge({
  quantity,
  isLow,
}: {
  quantity: number;
  isLow: boolean;
}) {
  if (quantity <= 0) return <Badge tone="danger">Out of stock</Badge>;
  if (isLow) return <Badge tone="warning">Low stock</Badge>;
  return <Badge tone="success">In stock</Badge>;
}

export { badgeVariants };
