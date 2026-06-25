"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Canonical Button — design system §3.1.
 * Variants: primary | secondary | ghost | danger. Sizes: sm(32) md(40) lg(48).
 * Focus ring is global (:focus-visible in globals.css). Loading locks width.
 */
const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-[600] transition-colors duration-fast ease-in-out disabled:pointer-events-none disabled:opacity-40 [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary-600 text-text-on-primary hover:bg-primary-700",
        secondary:
          "border border-border bg-surface-card text-gray-800 hover:bg-gray-50",
        ghost: "text-gray-700 hover:bg-gray-100",
        danger: "bg-danger-500 text-text-on-primary hover:bg-danger-700",
      },
      size: {
        sm: "h-8 px-3 text-small",
        md: "h-10 px-5 text-[15px]",
        lg: "h-12 px-5 text-[15px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, isLoading, children, disabled, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || isLoading}
        aria-busy={isLoading ? "true" : undefined}
        {...props}
      >
        {isLoading ? (
          <>
            {/* Keep label in layout (invisible) so width never shifts. */}
            <span className="invisible inline-flex items-center gap-2">
              {children}
            </span>
            <Loader2
              className="absolute animate-spin"
              aria-hidden="true"
            />
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
