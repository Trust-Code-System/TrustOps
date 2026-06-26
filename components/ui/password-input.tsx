"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, type InputProps } from "./input";

/**
 * Password field with a show/hide toggle — design system §3.2.
 * Wraps {@link Input}, swapping `type` between "password" and "text" and
 * rendering an eye button in the trailing slot. Forwards all Input props
 * (name, autoComplete, leadingIcon, error, …).
 */
export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  Omit<InputProps, "type" | "trailing">
>((props, ref) => {
  const [show, setShow] = React.useState(false);

  return (
    <Input
      {...props}
      ref={ref}
      type={show ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          tabIndex={-1}
          className="flex h-8 w-8 items-center justify-center rounded-sm text-text-muted transition-colors hover:text-text-primary focus:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-100"
        >
          {show ? <EyeOff /> : <Eye />}
        </button>
      }
    />
  );
});
PasswordInput.displayName = "PasswordInput";
