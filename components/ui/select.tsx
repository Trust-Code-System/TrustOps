"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

type OptionData = { value: string; label: string; disabled?: boolean };

/** Flatten <option>/<optgroup> children into plain {value,label} data. */
function collectOptions(children: React.ReactNode): OptionData[] {
  const out: OptionData[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === "optgroup") {
      out.push(...collectOptions(child.props.children));
      return;
    }
    if (child.type === "option") {
      const text = React.Children.toArray(child.props.children)
        .filter((c) => typeof c === "string" || typeof c === "number")
        .join("");
      out.push({
        value: String(child.props.value ?? ""),
        label: text,
        disabled: Boolean(child.props.disabled),
      });
    }
  });
  return out;
}

/**
 * Select — a fully themed dropdown built on a custom listbox so the OPEN menu
 * matches the design system (native <select> popups are drawn by the OS and
 * can't be styled). A visually-hidden real <select> is kept in sync so form
 * submission, `required` validation, and the `onChange`/`requestSubmit`
 * contract behave exactly like a native control. Drop-in for native <select>:
 * same props, same <option> children. Design system §3.2.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      error,
      children,
      value,
      defaultValue,
      onChange,
      disabled,
      "aria-label": ariaLabel,
      ...props
    },
    ref,
  ) => {
    const options = React.useMemo(() => collectOptions(children), [children]);
    const selectRef = React.useRef<HTMLSelectElement>(null);
    React.useImperativeHandle(ref, () => selectRef.current as HTMLSelectElement);

    const isControlled = value !== undefined;
    const firstValue = options.find((o) => !o.disabled)?.value ?? "";
    const [internal, setInternal] = React.useState<string>(
      defaultValue !== undefined ? String(defaultValue) : firstValue,
    );
    const currentValue = isControlled ? String(value) : internal;
    const selected = options.find((o) => o.value === currentValue);

    const [open, setOpen] = React.useState(false);
    const [activeIdx, setActiveIdx] = React.useState(0);
    const rootRef = React.useRef<HTMLDivElement>(null);
    const listRef = React.useRef<HTMLUListElement>(null);
    const uid = React.useId();

    // Push a selection through the hidden native <select> so React's onChange
    // (and anything reading e.target.value / requestSubmit) fires for real.
    const commit = React.useCallback(
      (next: string) => {
        const el = selectRef.current;
        if (el) {
          const setter = Object.getOwnPropertyDescriptor(
            HTMLSelectElement.prototype,
            "value",
          )?.set;
          setter?.call(el, next);
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
        if (!isControlled) setInternal(next);
        setOpen(false);
      },
      [isControlled],
    );

    // Close on outside click.
    React.useEffect(() => {
      if (!open) return;
      const onDown = (e: MouseEvent) => {
        if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener("mousedown", onDown);
      return () => document.removeEventListener("mousedown", onDown);
    }, [open]);

    // When opening, focus the active option for screen readers / scroll.
    React.useEffect(() => {
      if (!open) return;
      const idx = options.findIndex((o) => o.value === currentValue);
      setActiveIdx(idx >= 0 ? idx : 0);
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    const moveActive = (dir: 1 | -1) => {
      setActiveIdx((i) => {
        let n = i;
        for (let step = 0; step < options.length; step++) {
          n = (n + dir + options.length) % options.length;
          if (!options[n]?.disabled) return n;
        }
        return i;
      });
    };

    const onTriggerKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (!open) {
        if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
          e.preventDefault();
          setOpen(true);
        }
        return;
      }
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          moveActive(1);
          break;
        case "ArrowUp":
          e.preventDefault();
          moveActive(-1);
          break;
        case "Home":
          e.preventDefault();
          setActiveIdx(options.findIndex((o) => !o.disabled));
          break;
        case "End":
          e.preventDefault();
          setActiveIdx(
            options.length - 1 - [...options].reverse().findIndex((o) => !o.disabled),
          );
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (options[activeIdx] && !options[activeIdx].disabled)
            commit(options[activeIdx].value);
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          break;
        case "Tab":
          setOpen(false);
          break;
      }
    };

    // Keep the active option scrolled into view.
    React.useEffect(() => {
      if (!open) return;
      listRef.current
        ?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`)
        ?.scrollIntoView({ block: "nearest" });
    }, [activeIdx, open]);

    return (
      <div ref={rootRef} className="relative">
        {/* Visually hidden real <select> — owns form value, validation, events */}
        <select
          ref={selectRef}
          value={isControlled ? value : undefined}
          defaultValue={isControlled ? undefined : defaultValue}
          onChange={onChange}
          disabled={disabled}
          aria-hidden="true"
          tabIndex={-1}
          className="sr-only"
          {...props}
        >
          {children}
        </select>

        <button
          type="button"
          role="combobox"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-controls={`${uid}-list`}
          aria-expanded={open ? "true" : "false"}
          aria-label={ariaLabel}
          aria-invalid={error ? "true" : "false"}
          onClick={() => !disabled && setOpen((o) => !o)}
          onKeyDown={onTriggerKeyDown}
          className={cn(
            "flex h-10 min-h-[44px] w-full items-center justify-between gap-2 rounded-sm border bg-surface-card pl-3 pr-3 text-left text-[15px] text-text-primary transition-colors duration-fast focus:border-border-focus focus:outline-none focus:ring-[3px] focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-gray-50 sm:min-h-0",
            error && "border-danger-500 focus:border-danger-500 focus:ring-0",
            className,
          )}
        >
          <span className={cn("truncate", !selected?.label && "text-text-muted")}>
            {selected?.label || "Select…"}
          </span>
          <ChevronDown
            className={cn(
              "h-[18px] w-[18px] shrink-0 text-text-muted transition-transform duration-fast",
              open && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>

        {open && (
          <ul
            ref={listRef}
            id={`${uid}-list`}
            role="listbox"
            aria-label={ariaLabel}
            aria-activedescendant={`${uid}-opt-${activeIdx}`}
            className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border-subtle bg-surface-card p-1 shadow-lg"
          >
            {options.map((opt, idx) => {
              const isSelected = opt.value === currentValue;
              const isActive = idx === activeIdx;
              return (
                <li
                  key={`${opt.value}-${idx}`}
                  id={`${uid}-opt-${idx}`}
                  data-idx={idx}
                  role="option"
                  aria-selected={isSelected ? "true" : "false"}
                  aria-disabled={opt.disabled ? "true" : undefined}
                  onMouseEnter={() => !opt.disabled && setActiveIdx(idx)}
                  onClick={() => !opt.disabled && commit(opt.value)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 rounded-sm px-3 py-2 text-[15px]",
                    opt.disabled
                      ? "cursor-not-allowed text-text-disabled"
                      : isActive
                        ? "bg-primary-50 text-primary-700"
                        : "text-text-primary",
                    isSelected && "font-[600]",
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 shrink-0 text-primary-600" aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  },
);
Select.displayName = "Select";
