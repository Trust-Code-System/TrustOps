"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * DatePicker — a fully styled replacement for the native <input type="date">,
 * so the calendar matches the app palette instead of the OS chrome.
 *
 * Drop-in for both patterns already in the app:
 *  - Controlled:  <DatePicker value={v} onChange={setV} />  (onChange gets a yyyy-mm-dd string)
 *  - Form field:  <DatePicker name="from" defaultValue={iso} />  (writes a hidden input)
 *
 * Dates are handled as local yyyy-mm-dd strings end to end — no UTC drift.
 */

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseISO(s: string | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplay(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Days for a Monday-first 6-row grid covering the given month. */
function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  // JS: 0=Sun..6=Sat. Shift so Monday is column 0.
  const lead = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - lead);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export interface DatePickerProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
}

export function DatePicker({
  value,
  defaultValue,
  onChange,
  name,
  disabled,
  error,
  className,
  placeholder = "Select date",
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState<string>(defaultValue ?? "");
  const current = isControlled ? value ?? "" : internal;

  const selected = parseISO(current);
  const [open, setOpen] = React.useState(false);
  const today = React.useMemo(() => new Date(), []);
  const [view, setView] = React.useState(() => selected ?? today);
  const ref = React.useRef<HTMLDivElement>(null);

  // Keep the visible month in step with the selected value (controlled updates).
  React.useEffect(() => {
    if (selected) setView(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const commit = (iso: string) => {
    if (!isControlled) setInternal(iso);
    onChange?.(iso);
  };

  const pick = (d: Date) => {
    commit(toISO(d));
    setOpen(false);
  };

  const grid = monthGrid(view.getFullYear(), view.getMonth());
  const shiftMonth = (delta: number) =>
    setView(new Date(view.getFullYear(), view.getMonth() + delta, 1));

  return (
    <div ref={ref} className={cn("relative", className)}>
      {name && <input type="hidden" name={name} value={current} />}

      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel ?? "Choose date"}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 min-h-[44px] w-full items-center gap-2 rounded-sm border bg-surface-card px-3 text-left text-[15px] transition-colors duration-fast focus:outline-none focus:border-border-focus focus:ring-[3px] focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-text-disabled sm:min-h-0",
          error && "border-danger-500 focus:border-danger-500 focus:ring-0",
        )}
      >
        <CalendarIcon className="h-[18px] w-[18px] shrink-0 text-text-muted" aria-hidden="true" />
        <span className={cn("flex-1 truncate", !selected && "text-gray-500")}>
          {selected ? formatDisplay(selected) : placeholder}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Calendar"
          className="absolute left-0 top-full z-50 mt-1 w-[280px] rounded-md border border-border-subtle bg-surface-card p-3 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-body-strong text-text-primary">
              {MONTHS[view.getMonth()]} {view.getFullYear()}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label="Previous month"
                className="flex h-7 w-7 items-center justify-center rounded-sm text-text-muted hover:bg-gray-100 hover:text-text-primary"
              >
                <ChevronLeft className="h-[18px] w-[18px]" />
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label="Next month"
                className="flex h-7 w-7 items-center justify-center rounded-sm text-text-muted hover:bg-gray-100 hover:text-text-primary"
              >
                <ChevronRight className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="flex h-8 items-center justify-center text-caption font-[600] text-text-muted"
              >
                {w}
              </div>
            ))}
            {grid.map((d) => {
              const inMonth = d.getMonth() === view.getMonth();
              const isSelected = selected && sameDay(d, selected);
              const isToday = sameDay(d, today);
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => pick(d)}
                  aria-pressed={isSelected ? true : undefined}
                  className={cn(
                    "flex h-9 items-center justify-center rounded-sm text-small tabular transition-colors",
                    isSelected
                      ? "bg-primary-600 font-[600] text-text-on-primary hover:bg-primary-700"
                      : inMonth
                        ? "text-text-primary hover:bg-gray-100"
                        : "text-gray-400 hover:bg-gray-100",
                    !isSelected && isToday && "font-[700] text-primary-600",
                  )}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-border-subtle pt-2">
            <button
              type="button"
              onClick={() => {
                commit("");
                setOpen(false);
              }}
              className="rounded-sm px-2 py-1 text-small font-[500] text-text-secondary hover:bg-gray-100"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => pick(new Date())}
              className="rounded-sm px-2 py-1 text-small font-[600] text-primary-700 hover:bg-gray-100"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
