import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

/** Native select styled to match Input — design system §3.2. */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={error ? "true" : undefined}
        className={cn(
          "h-10 min-h-[44px] sm:min-h-0 w-full appearance-none rounded-sm border bg-surface-card pl-3 pr-9 text-[15px] text-text-primary transition-colors duration-fast focus:outline-none focus:border-border-focus focus:ring-[3px] focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-gray-50",
          error && "border-danger-500 focus:border-danger-500 focus:ring-0",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-text-muted"
        aria-hidden="true"
      />
    </div>
  ),
);
Select.displayName = "Select";
