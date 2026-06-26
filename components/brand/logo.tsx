import { cn } from "@/lib/utils";

/**
 * TrustOps brand logo.
 *
 * The mark is a white trust shield on an indigo tile, carrying an upward
 * "verified growth" check whose tip is a money-positive emerald dot. It speaks
 * the design-system language directly: indigo = brand/action, emerald =
 * money-positive, restraint over decoration. Every color flows through the
 * design tokens (CSS variables) so a future dark mode is a variable swap, and
 * the geometry stays legible all the way down to favicon size.
 */

interface LogoMarkProps {
  /** Pixel size of the square mark. Defaults to 28. */
  size?: number;
  className?: string;
}

export function LogoMark({ size = 28, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect width="32" height="32" rx="8" fill="var(--color-primary-600)" />
      {/* Trust shield */}
      <path
        d="M16 6 L25 9.2 L25 15.5 C25 20.5 21 23.8 16 26 C11 23.8 7 20.5 7 15.5 L7 9.2 Z"
        fill="#FFFFFF"
      />
      {/* Verified-growth check, drawn as brand-colored negative space */}
      <path
        d="M11.5 16.2 L14.8 19.4 L20.5 12.6"
        stroke="var(--color-primary-600)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Money-positive accent at the top of the rise */}
      <circle cx="20.6" cy="12.5" r="1.7" fill="var(--color-success-500)" />
    </svg>
  );
}

interface LogoProps extends LogoMarkProps {
  /** Render only the tile mark, no wordmark text. Defaults to false. */
  markOnly?: boolean;
  /** Wordmark label. Defaults to "TrustOps". */
  label?: string;
  /** Tailwind classes for the wordmark text. */
  wordmarkClassName?: string;
}

export function Logo({
  markOnly = false,
  label = "TrustOps",
  size = 28,
  className,
  wordmarkClassName,
}: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} />
      {!markOnly && (
        <span
          className={cn(
            "font-[700] tracking-[-0.01em] text-primary-700",
            wordmarkClassName ?? "text-body-strong",
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
}
