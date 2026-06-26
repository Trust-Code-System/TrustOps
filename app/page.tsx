import Link from "next/link";
import {
  Package,
  ScanLine,
  Sparkles,
  LineChart,
  ArrowRight,
  Plus,
  TrendingUp,
  Store,
  Truck,
  UtensilsCrossed,
  Dumbbell,
  ShoppingBag,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";

/**
 * Public marketing landing page (route "/"). Outside the (app) and (auth) route
 * groups, so it renders on the bare root layout — no app shell, no auth gate.
 * Static and server-rendered; the only interactions are links.
 *
 * Layout mirrors the "TrustOps AI" Stitch design (Kinetic Ledger): a two-column
 * hero with a floating revenue chip, a bento feature grid, a trusted-by strip,
 * a final CTA, and a dark footer. All hex flows through the app design tokens.
 */

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-surface-card/80 shadow-xs backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-h2 font-[700] text-primary-700">
          TrustOps AI
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {["Solutions", "AI Assistant", "Analytics", "Pricing", "Resources"].map(
            (item) => (
              <a
                key={item}
                href="#features"
                className="rounded-md px-3 py-2 text-body text-text-secondary transition-colors hover:bg-gray-100 hover:text-primary-700"
              >
                {item}
              </a>
            ),
          )}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
            Log in
          </Link>
          <Link href="/signup" className={buttonVariants()}>
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Soft radial brand wash, mirrors Stitch .hero-bg */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 20% 45%, rgba(53,68,168,0.14) 0%, rgba(248,249,250,0) 60%)",
        }}
        aria-hidden="true"
      />
      <div className="relative mx-auto grid max-w-content grid-cols-1 items-center gap-12 px-4 pb-24 pt-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:pt-24">
        <div>
          <h1 className="text-metric-lg tracking-[-0.02em] text-primary-700 sm:text-[48px] sm:leading-[54px]">
            The Operating System for African SMEs
          </h1>
          <p className="mt-6 max-w-xl text-[17px] leading-[28px] text-text-secondary">
            All-in-one business management for modern entrepreneurs. Handle
            inventory, sales, and analytics with banking-grade security and
            AI-powered insights.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/signup"
              className={buttonVariants({ size: "lg" }) + " px-8"}
            >
              Get Started for Free
              <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              className={
                buttonVariants({ variant: "secondary", size: "lg" }) + " px-8"
              }
            >
              Book a Demo
            </Link>
          </div>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}

/** In-app dashboard mock anchoring the hero, with a floating revenue chip. */
function HeroPreview() {
  const bars = [40, 65, 45, 80, 55, 35, 95];
  return (
    <div className="relative" aria-hidden="true">
      <div className="rounded-lg border border-border-subtle bg-surface-card p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <p className="text-body-strong text-text-primary">Revenue Trend</p>
          <span className="text-small text-text-muted">This Week</span>
        </div>
        <div className="mt-5 flex h-44 items-end justify-between gap-2">
          {bars.map((h, i) => (
            <div
              key={i}
              className={
                "w-full rounded-t-sm " +
                (i === bars.length - 1 ? "bg-primary-600" : "bg-primary-200")
              }
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {[
            { label: "Unpaid", value: "₦850,000" },
            { label: "Customers", value: "1,204" },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-md border border-border-subtle bg-surface-page p-4"
            >
              <p className="text-caption uppercase tracking-[0.04em] text-text-muted">
                {m.label}
              </p>
              <p className="mt-1 text-h2 tabular text-text-primary">{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Floating revenue chip */}
      <div className="absolute -bottom-6 -left-4 flex items-center gap-4 rounded-lg border border-border-subtle bg-surface-card p-5 shadow-lg sm:-left-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-50 text-success-700">
          <TrendingUp className="h-6 w-6" />
        </span>
        <div>
          <p className="text-caption uppercase tracking-[0.04em] text-text-muted">
            Today&apos;s Revenue
          </p>
          <p className="text-metric tabular text-text-primary">₦450,000</p>
        </div>
      </div>
    </div>
  );
}

const BENTO = {
  inventory: {
    icon: Package,
    title: "Smart Inventory",
    body: "Real-time tracking and low-stock alerts keep your shelves stocked and customers happy.",
  },
  sales: {
    icon: ScanLine,
    title: "Atomic Sales",
    body: "Record transactions in seconds with professional invoices.",
  },
  ai: {
    icon: Sparkles,
    title: "AI Assistant",
    body: "Your business data, decoded. Powered by Claude.",
  },
  analytics: {
    icon: LineChart,
    title: "Global Analytics",
    body: "Real-time reporting and revenue trends across all your locations.",
  },
} as const;

function BentoIcon({
  icon: Icon,
  tone,
}: {
  icon: typeof Package;
  tone: "primary" | "success" | "warning";
}) {
  const toneClass = {
    primary: "bg-primary-50 text-primary-600",
    success: "bg-success-50 text-success-700",
    warning: "bg-warning-50 text-warning-700",
  }[tone];
  return (
    <span
      className={`inline-flex h-10 w-10 items-center justify-center rounded-md ${toneClass}`}
    >
      <Icon className="h-6 w-6" aria-hidden="true" />
    </span>
  );
}

function Features() {
  return (
    <section id="features" className="bg-gray-100 py-24">
      <div className="mx-auto max-w-content px-4 sm:px-6">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="text-metric tracking-[-0.02em] text-text-primary">
            Powerful tools, simply designed.
          </h2>
          <p className="mt-4 text-body text-text-secondary">
            Everything you need to manage your operations without the cognitive
            overload.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Smart Inventory — wide */}
          <div className="flex flex-col justify-between rounded-lg border border-border-subtle bg-surface-card p-8 shadow-sm md:col-span-2">
            <div className="mb-8">
              <BentoIcon icon={BENTO.inventory.icon} tone="primary" />
              <h3 className="mt-4 text-h3 text-text-primary">
                {BENTO.inventory.title}
              </h3>
              <p className="mt-2 text-body text-text-secondary">
                {BENTO.inventory.body}
              </p>
            </div>
            <div className="mt-auto flex h-48 items-end justify-between gap-2 rounded-md border border-border-subtle bg-surface-page p-4">
              {[35, 55, 42, 68, 50, 75, 60, 88].map((h, i) => (
                <div
                  key={i}
                  className="w-full rounded-t-sm bg-primary-300"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>

          {/* Atomic Sales */}
          <div className="flex flex-col justify-between rounded-lg border border-border-subtle bg-surface-card p-8 shadow-sm">
            <div>
              <BentoIcon icon={BENTO.sales.icon} tone="success" />
              <h3 className="mt-4 text-h3 text-text-primary">
                {BENTO.sales.title}
              </h3>
              <p className="mt-2 text-body text-text-secondary">
                {BENTO.sales.body}
              </p>
            </div>
            <div className="mt-8">
              <Link
                href="/signup"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary-600 px-4 py-3 text-[15px] font-[600] text-text-on-primary shadow-md transition-colors hover:bg-primary-700"
              >
                <Plus className="h-[18px] w-[18px]" aria-hidden="true" />
                Record Sale
              </Link>
            </div>
          </div>

          {/* AI Assistant */}
          <div className="flex flex-col justify-between rounded-lg border border-border-subtle bg-surface-card p-8 shadow-sm">
            <div>
              <BentoIcon icon={BENTO.ai.icon} tone="warning" />
              <h3 className="mt-4 text-h3 text-text-primary">{BENTO.ai.title}</h3>
              <p className="mt-2 text-body text-text-secondary">{BENTO.ai.body}</p>
            </div>
            <div className="mt-8 rounded-md border border-border-subtle bg-surface-page p-4">
              <p className="text-small italic text-text-secondary">
                &ldquo;Sales are up 15% this week. Consider restocking item
                XYZ.&rdquo;
              </p>
            </div>
          </div>

          {/* Global Analytics — wide */}
          <div className="flex flex-col justify-between rounded-lg border border-border-subtle bg-surface-card p-8 shadow-sm md:col-span-2">
            <div className="mb-8">
              <BentoIcon icon={BENTO.analytics.icon} tone="primary" />
              <h3 className="mt-4 text-h3 text-text-primary">
                {BENTO.analytics.title}
              </h3>
              <p className="mt-2 text-body text-text-secondary">
                {BENTO.analytics.body}
              </p>
            </div>
            <div className="mt-auto h-48 w-full overflow-hidden rounded-md border border-border-subtle bg-surface-page">
              <svg
                viewBox="0 0 400 160"
                preserveAspectRatio="none"
                className="h-full w-full"
                aria-hidden="true"
              >
                <polyline
                  points="0,130 60,110 120,120 180,70 240,85 300,40 360,55 400,20"
                  fill="none"
                  stroke="var(--color-primary-500)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Trust() {
  const icons = [Store, Truck, UtensilsCrossed, Dumbbell, ShoppingBag];
  return (
    <section className="bg-surface-page py-20">
      <div className="mx-auto max-w-content px-4 text-center sm:px-6">
        <p className="mb-8 text-caption uppercase tracking-[0.1em] text-text-muted">
          Trusted by 10,000+ businesses across Nigeria and beyond
        </p>
        <div className="flex flex-wrap items-center justify-center gap-12 text-gray-400">
          {icons.map((Icon, i) => (
            <Icon key={i} className="h-9 w-9" aria-hidden="true" />
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="relative overflow-hidden py-24">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(53,68,168,0.12) 0%, rgba(248,249,250,0) 65%)",
        }}
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-metric-lg tracking-[-0.02em] text-primary-700">
          Join the future of SME operations.
        </h2>
        <p className="mt-6 text-[17px] leading-[28px] text-text-secondary">
          Stop wrestling with spreadsheets. Start growing with TrustOps AI.
        </p>
        <Link
          href="/signup"
          className={buttonVariants({ size: "lg" }) + " mt-10 px-10"}
        >
          Build Your Business Today
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  const columns = [
    { title: "Legal", links: ["Privacy Policy", "Terms of Service"] },
    { title: "Support", links: ["Contact Support", "Documentation"] },
    { title: "Community", links: ["Global SME Network"] },
  ];
  return (
    <footer className="bg-gray-900 py-12">
      <div className="mx-auto flex max-w-content flex-col justify-between gap-8 px-4 sm:px-6 md:flex-row">
        <div>
          <span className="block text-h3 font-[700] text-white">TrustOps AI</span>
          <p className="mt-4 text-small text-gray-400">
            © {new Date().getFullYear()} TrustOps AI. Empowering African SMEs.
          </p>
        </div>
        <nav
          className="flex flex-col gap-8 md:flex-row md:gap-12"
          aria-label="Footer"
        >
          {columns.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <span className="text-caption uppercase tracking-[0.05em] text-primary-300">
                {col.title}
              </span>
              {col.links.map((link) => (
                <a
                  key={link}
                  href="#"
                  className="text-small text-gray-300 transition-colors hover:text-white"
                >
                  {link}
                </a>
              ))}
            </div>
          ))}
        </nav>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-dvh bg-surface-page">
      <Header />
      <Hero />
      <Features />
      <Trust />
      <FinalCta />
      <Footer />
    </main>
  );
}
