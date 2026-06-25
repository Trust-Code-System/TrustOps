"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Modal — design system §3.7.
 * Desktop: centered dialog (480px confirm / 640px form), radius-lg, shadow-lg.
 * Mobile: slides up as a bottom sheet with a drag handle.
 * Closes on Escape and scrim click. Restores focus to the trigger on close.
 */
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: "confirm" | "form";
  children: React.ReactNode;
  /** Footer actions, rendered bottom-right (desktop) / stacked (mobile). */
  footer?: React.ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "form",
  children,
  footer,
}: ModalProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const descId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    // Move focus into the dialog.
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
    >
      {/* Scrim */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[var(--surface-overlay)]"
        tabIndex={-1}
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "relative z-10 w-full bg-surface-card shadow-lg outline-none",
          // Mobile bottom sheet
          "max-h-[90vh] overflow-y-auto rounded-t-lg",
          // Desktop centered modal
          "sm:rounded-lg",
          size === "confirm" ? "sm:max-w-modal-confirm" : "sm:max-w-modal-form",
        )}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-gray-300" aria-hidden="true" />
        </div>

        <div className="flex items-start justify-between gap-4 p-4 sm:p-6">
          <div>
            <h2 id={titleId} className="text-h2 text-text-primary">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-small text-text-muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 rounded-sm p-1 text-text-muted hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 pb-4 sm:px-6">{children}</div>

        {footer && (
          <div className="flex flex-col-reverse gap-3 border-t border-border-subtle p-4 sm:flex-row sm:justify-end sm:p-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
