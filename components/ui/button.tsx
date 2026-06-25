"use client";

import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button-variants";

/**
 * Canonical Button — design system §3.1.
 * Variants: primary | secondary | ghost | danger. Sizes: sm(32) md(40) lg(48).
 * Focus ring is global (:focus-visible in globals.css). Loading locks width.
 * The cva lives in ./button-variants (a non-"use client" module) so Server
 * Components can call buttonVariants() directly.
 */

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
