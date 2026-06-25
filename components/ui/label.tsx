import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Field label — design system §3.2. Caption weight 500, secondary text.
 * Required is marked with a muted asterisk (never red by default).
 */
export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "mb-2 block text-caption font-[500] text-text-secondary",
        className,
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-1 text-text-muted" aria-hidden="true">
          *
        </span>
      )}
    </label>
  ),
);
Label.displayName = "Label";
