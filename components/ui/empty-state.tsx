import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Empty state — design system §3.9.
 * One line icon (monochrome gray-300), one h3 of what's missing, one small line
 * of direction, one primary action. Tone: an invitation, not an apology.
 */
export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
    >
      <Icon
        className="mb-4 h-10 w-10 text-gray-300"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <h3 className="text-h3 text-text-primary">{title}</h3>
      <p className="mt-1 max-w-[40ch] text-small text-text-muted">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
