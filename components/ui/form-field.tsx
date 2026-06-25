import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Field scaffold: label above, control, helper/error below.
 * Wires the label to the control and announces errors to screen readers.
 * Forms use one column always (design system §3.10).
 */
export interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  /** Error text turns the helper line danger and links via aria-describedby. */
  error?: string;
  helper?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  id,
  label,
  required,
  error,
  helper,
  className,
  children,
}: FormFieldProps) {
  const describedBy = error ? `${id}-error` : helper ? `${id}-helper` : undefined;

  return (
    <div className={cn("w-full", className)}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {/* Pass id + aria-describedby to the single control child. */}
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement, {
            id,
            "aria-describedby": describedBy,
          })
        : children}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-small text-danger-700" role="alert">
          {error}
        </p>
      ) : helper ? (
        <p id={`${id}-helper`} className="mt-1 text-small text-text-muted">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
