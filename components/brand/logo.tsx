import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * TrustOps brand logo.
 *
 * The mark is a rounded tile carrying the brand's signature indigo→violet→
 * fuchsia gradient, with a white trust shield and an upward "verified growth"
 * check tipped by a money-positive emerald dot. The gradient fill lets the same
 * mark sit on both the dark marketing canvas and the light app shell. A soft
 * top sheen gives it dimensional depth so it reads as a crafted object, not a
 * flat glyph, all the way down to favicon size.
 *
 * The wordmark is set in the display serif (Fraunces) for an editorial,
 * premium personality — its color is supplied by the caller via
 * `wordmarkClassName` so each surface controls contrast.
 */

interface LogoMarkProps {
  /** Pixel size of the square mark. Defaults to 28. */
  size?: number;
  className?: string;
}

export function LogoMark({ size = 28, className }: LogoMarkProps) {
  // Unique gradient ids so multiple marks on one page don't collide.
  const uid = useId().replace(/:/g, "");
  const fill = `fill-${uid}`;
  const sheen = `sheen-${uid}`;

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
      <defs>
        <linearGradient id={fill} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="52%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#d946ef" />
        </linearGradient>
        <linearGradient id={sheen} x1="16" y1="0" x2="16" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Gradient tile + dimensional top sheen */}
      <rect width="32" height="32" rx="9" fill={`url(#${fill})`} />
      <rect width="32" height="32" rx="9" fill={`url(#${sheen})`} />

      {/* Trust shield */}
      <path
        d="M16 6 L25 9.2 L25 15.5 C25 20.5 21 23.8 16 26 C11 23.8 7 20.5 7 15.5 L7 9.2 Z"
        fill="#ffffff"
      />
      {/* Verified-growth check */}
      <path
        d="M11.5 16.2 L14.8 19.4 L20.5 12.6"
        stroke="#7c3aed"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Money-positive accent at the top of the rise */}
      <circle cx="20.6" cy="12.5" r="1.7" fill="#10b981" />
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
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {!markOnly && (
        <span
          className={cn(
            "font-display font-[600] tracking-[-0.01em] text-primary-700",
            wordmarkClassName ?? "text-[18px] leading-none",
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
}
