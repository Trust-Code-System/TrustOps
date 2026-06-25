import { cva } from "class-variance-authority";

/**
 * Button style variants — design system §3.1.
 * Variants: primary | secondary | ghost | danger. Sizes: sm(32) md(40) lg(48).
 *
 * Kept in a NON-"use client" module on purpose: Server Components call this as a
 * function (e.g. to style a <Link> like a button). Importing it from the
 * "use client" button.tsx would hand the server a client-reference proxy, not
 * the function, throwing "buttonVariants is not a function" at request time.
 */
export const buttonVariants = cva(
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
