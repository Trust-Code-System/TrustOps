/**
 * No "use client" here on purpose: these are presentational, hook-free building
 * blocks, so they're a *shared* module. That lets the server-component marketing
 * pages pass Lucide icon components (functions) straight into <GradientIcon>
 * without crossing a client boundary, while the only animated piece (<Reveal>)
 * is a client component rendered from here as a child — which RSC allows.
 */
import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BRAND_GRADIENT,
  BTN_GHOST,
  BTN_PRIMARY,
  GLASS_CARD,
  TEXT_GRADIENT,
} from "./brand";
import { Reveal } from "./motion";

/**
 * Reusable building blocks for the marketing sub-pages so each one
 * (Solutions, Pricing, Legal…) is composed from the same vocabulary and stays
 * pixel-consistent with the landing page.
 */

const GRID_MASK: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
  backgroundSize: "48px 48px",
  maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent)",
  WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent)",
};

/** Gradient-filled rounded icon tile (matches the landing feature icons). */
export function GradientIcon({
  icon: Icon,
  className,
}: {
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-[0_8px_24px_-6px_rgba(168,85,247,0.7)]",
        BRAND_GRADIENT,
        className,
      )}
    >
      <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
    </span>
  );
}

/** Glass surface with optional hover lift. */
export function GlassCard({
  children,
  className,
  hover = false,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        GLASS_CARD,
        hover &&
          "transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.05]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Standard page header: eyebrow badge, big display title with a gradient
 *  highlight, supporting copy, and optional action buttons. */
export function PageHero({
  eyebrow,
  title,
  highlight,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  highlight?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-white/5">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-40%] h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-violet-600/25 blur-[130px]" />
        <div className="absolute -right-40 top-0 h-[26rem] w-[26rem] rounded-full bg-fuchsia-600/20 blur-[120px]" />
        <div className="absolute -left-40 top-10 h-[24rem] w-[24rem] rounded-full bg-indigo-600/20 blur-[120px]" />
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={GRID_MASK} aria-hidden="true" />

      <div className="relative mx-auto max-w-content px-4 py-20 text-center sm:px-6 sm:py-28">
        <Reveal>
          {eyebrow && (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-caption font-[600] uppercase tracking-[0.12em] text-white/90 backdrop-blur">
              {eyebrow}
            </span>
          )}
          <h1 className="mt-6 font-display text-[40px] font-[600] leading-[1.05] tracking-[-0.02em] text-white sm:text-[60px]">
            {title}
            {highlight && (
              <>
                {" "}
                <span className={cn(TEXT_GRADIENT, "italic")}>{highlight}</span>
              </>
            )}
          </h1>
          {subtitle && (
            <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-[28px] text-white/60">
              {subtitle}
            </p>
          )}
          {actions && (
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              {actions}
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}

/** Centered section heading with eyebrow + gradient highlight. */
export function SectionHeading({
  eyebrow,
  title,
  highlight,
  subtitle,
  className,
}: {
  eyebrow?: string;
  title: string;
  highlight?: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <Reveal className={cn("mx-auto mb-14 max-w-2xl text-center", className)}>
      {eyebrow && (
        <p className="mb-4 text-caption uppercase tracking-[0.12em] text-fuchsia-300/80">
          {eyebrow}
        </p>
      )}
      <h2 className="font-display text-metric font-[600] tracking-[-0.02em] text-white sm:text-[40px]">
        {title}
        {highlight && (
          <>
            {" "}
            <span className={cn(TEXT_GRADIENT, "italic")}>{highlight}</span>
          </>
        )}
      </h2>
      {subtitle && <p className="mt-4 text-body text-white/55">{subtitle}</p>}
    </Reveal>
  );
}

/** Generic content section wrapper with consistent vertical rhythm + width. */
export function Section({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("relative py-20 sm:py-24", className)}>
      <div className="mx-auto max-w-content px-4 sm:px-6">{children}</div>
    </section>
  );
}

/** The reusable gradient CTA band that closes most marketing pages. */
export function MarketingCTA({
  title = "Join the future of SME operations.",
  subtitle = "Stop wrestling with spreadsheets. Start growing with TrustOps AI.",
  ctaLabel = "Get Started for Free",
  href = "/signup",
}: {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  href?: string;
}) {
  return (
    <section className="px-4 pb-28 pt-8 sm:px-6">
      <Reveal>
        <div
          className={cn(
            "relative mx-auto max-w-content overflow-hidden rounded-[2.5rem] px-6 py-20 text-center shadow-[0_40px_120px_-30px_rgba(168,85,247,0.8)]",
            BRAND_GRADIENT,
          )}
        >
          <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-fuchsia-300/30 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-indigo-300/30 blur-3xl" aria-hidden="true" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-metric-lg font-[600] tracking-[-0.02em] text-white sm:text-[44px]">
              {title}
            </h2>
            <p className="mt-5 text-[17px] leading-[28px] text-white/85">{subtitle}</p>
            <Link
              href={href}
              className="mt-10 inline-flex items-center gap-2 rounded-full bg-white px-10 py-4 text-[15px] font-[700] text-[#0a0712] shadow-xl transition-transform hover:-translate-y-0.5"
            >
              {ctaLabel}
              <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export { BTN_PRIMARY, BTN_GHOST };
