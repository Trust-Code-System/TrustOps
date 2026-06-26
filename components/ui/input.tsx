import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Input — design system §3.2.
 * 40px (44px touch via min-h on mobile). Radius sm. Focus: border-focus + ring.
 * Error: danger border. Money inputs: right-aligned tabular with ₦ addon.
 */
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  /** Leading addon, e.g. the ₦ symbol for money inputs (a boxed addon). */
  leadingAddon?: React.ReactNode;
  /** Inset leading icon rendered inside the field (e.g. mail/lock on auth). */
  leadingIcon?: React.ReactNode;
  /** Inset trailing control rendered inside the field (e.g. a show-password toggle). */
  trailing?: React.ReactNode;
  /** Right-align + tabular-nums for money/numeric values. */
  numeric?: boolean;
}

const baseField =
  "h-10 min-h-[44px] sm:min-h-0 w-full rounded-sm border bg-surface-card px-3 text-[15px] text-text-primary placeholder:text-gray-500 transition-colors duration-fast focus:outline-none focus:border-border-focus focus:ring-[3px] focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-text-disabled";

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, leadingAddon, leadingIcon, trailing, numeric, ...props }, ref) => {
    const field = (
      <input
        ref={ref}
        aria-invalid={error ? "true" : undefined}
        className={cn(
          baseField,
          error && "border-danger-500 focus:border-danger-500 focus:ring-0",
          numeric && "tabular text-right",
          leadingAddon && "rounded-l-none border-l-0",
          leadingIcon && "pl-10",
          trailing && "pr-10",
          className,
        )}
        {...props}
      />
    );

    if (leadingIcon || trailing) {
      return (
        <div className="relative">
          {leadingIcon && (
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted [&_svg]:h-[18px] [&_svg]:w-[18px]"
              aria-hidden="true"
            >
              {leadingIcon}
            </span>
          )}
          {field}
          {trailing && (
            <span className="absolute right-1 top-1/2 -translate-y-1/2 [&_svg]:h-[18px] [&_svg]:w-[18px]">
              {trailing}
            </span>
          )}
        </div>
      );
    }

    if (!leadingAddon) return field;

    return (
      <div className="flex items-stretch">
        <span
          className={cn(
            "inline-flex select-none items-center rounded-l-sm border border-r-0 bg-gray-50 px-3 text-[15px] text-text-muted",
            error && "border-danger-500",
          )}
          aria-hidden="true"
        >
          {leadingAddon}
        </span>
        {field}
      </div>
    );
  },
);
Input.displayName = "Input";
