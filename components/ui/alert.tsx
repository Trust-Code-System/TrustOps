import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Inline alert for form-level errors. Specific and fixable, in the interface's
 * voice (design system §6). Announced to screen readers via role="alert".
 */
export function Alert({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-sm border border-danger-500 bg-danger-50 px-3 py-2 text-small text-danger-700",
        className,
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
