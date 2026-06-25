import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={error ? "true" : undefined}
      className={cn(
        "min-h-[88px] w-full rounded-sm border bg-surface-card px-3 py-2 text-[15px] text-text-primary placeholder:text-gray-500 transition-colors duration-fast focus:outline-none focus:border-border-focus focus:ring-[3px] focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-gray-50",
        error && "border-danger-500 focus:border-danger-500 focus:ring-0",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
