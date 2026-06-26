import Link from "next/link";
import {
  Package,
  ScanLine,
  Sparkles,
  LineChart,
  ArrowUpRight,
  Plus,
  Play,
  Mail,
  Activity,
  Store,
  Truck,
  UtensilsCrossed,
  Dumbbell,
  ShoppingBag,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { Logo, LogoMark } from "@/components/brand/logo";

/*
 * Landing-only accent palette. These hexes live OUTSIDE the app design tokens
 * on purpose — they exist only on this marketing page to hit the dark,
 * mint-accented "kinetic" hero brief, and must never leak into the product UI.
 */
const INK = "#0d0f17"; // near-black hero container + dark stat card
const MINT = "#a3e9df"; // hero panel
const TAN = "#ddc6a8"; // "businesses onboarded" card
const LAVENDER = "#c8ccf8"; // "metrics" card

/**
 * Public marketing landing page (route "/"). Outside the (app) and (auth) route
 * groups, so it renders on the bare root layout — no app shell, no auth gate.
 * Static and server-rendered; the only interactions are links.
 *
 * The hero is a self-contained dark "screen": a rounded near-black container
 * holding the nav, a mint hero panel with heavy display type, and a 3-card
 * bento row (dark chart / tan stat / lavender metrics) — the "Metly"-style
 * reference brief. Below it the feature grid, trust strip, CTA and footer carry
 * the same accent palette so the page reads as one composition.
 */

/** Nav row that lives INSIDE the dark hero container, like the reference. */
function HeroNav() {
  return (
    <nav
      className="flex items-center justify-between px-4 py-4 sm:px-6"
      aria-label="Primary"
    >
      <Link href="/" aria-label="TrustOps AI home">
        <Logo
          label="TrustOps AI"
          size={30}
          wordmarkClassName="text-white text-h2"
        />
      </Link>
      <div className="hidden items-center gap-8 md:flex">
        {["Solutions", "AI Assistant", "Analytics", "Pricing"].map((item) => (
          <a
            key={item}
            href="#features"
            className="text-small font-[600] uppercase tracking-[0.08em] text-white/70 transition-colors hover:text-white"
          >
            {item}
          </a>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="hidden rounded-full px-4 py-2 text-small font-[600] text-white/80 transition-colors hover:text-white sm:inline-flex"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-small font-[700] text-[color:var(--ink)] transition-transform hover:-translate-y-0.5"
          style={{ ["--ink" as string]: INK }}
        >
          Get Started
        </Link>
      </div>
    </nav>
  );
}

/** The mint hero panel: eyebrow, heavy headline, CTA link, kinetic graphic. */
function HeroPanel() {
  return (
    <div
      className="relative overflow-hidden rounded-[20px]"
      style={{ backgroundColor: MINT, color: INK }}
    >
      <div className="grid grid-cols-1 items-center gap-8 p-8 sm:p-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <span className="text-caption font-[700] uppercase tracking-[0.18em] text-black/50">
            Business Operating System
          </span>
          <h1 className="mt-5 text-[40px] font-[800] leading-[1.02] tracking-[-0.03em] sm:text-[58px]">
            We Make
            <br />
            Your Business
            <br />
            Unstoppable
          </h1>
          <Link
            href="/signup"
            className="group mt-10 inline-flex items-center gap-3 border-b-2 border-black/80 pb-2 text-small font-[700] uppercase tracking-[0.15em]"
          >
            Book a Consultation
            <Mail className="h-[18px] w-[18px] transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <HeroGraphic />
      </div>
    </div>
  );
}

/**
 * Asset-free stand-in for the reference portrait: concentric orbit rings, a
 * traveling node, the brand mark at the center, and a circular rotating-text
 * badge — the same "kinetic" energy without shipping an image.
 */
function HeroGraphic() {
  return (
    <div
      className="relative mx-auto hidden aspect-square w-full max-w-[360px] lg:block"
      aria-hidden="true"
    >
      <svg viewBox="0 0 360 360" className="h-full w-full">
        <g fill="none" stroke={INK} strokeOpacity="0.22">
          <circle cx="180" cy="180" r="150" />
          <circle cx="180" cy="180" r="110" />
          <circle cx="180" cy="180" r="70" />
        </g>
        {/* traveling node on the outer orbit */}
        <circle cx="312" cy="120" r="7" fill={INK} />
      </svg>

      {/* Center brand mark */}
      <span className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg">
        <LogoMark size={40} />
      </span>

      {/* Rotating-text badge, lower-right like the reference */}
      <span
        className="absolute bottom-2 right-2 flex h-24 w-24 items-center justify-center rounded-full"
        style={{ backgroundColor: INK }}
      >
        <svg viewBox="0 0 100 100" className="h-full w-full animate-[spin_14s_linear_infinite] motion-reduce:animate-none">
          <defs>
            <path
              id="badge-curve"
              d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0"
            />
          </defs>
          <text
            fill={MINT}
            fontSize="9.5"
            fontWeight="700"
            letterSpacing="2.5"
          >
            <textPath href="#badge-curve">
              · START GROWING TODAY · WITH TRUSTOPS AI
            </textPath>
          </text>
        </svg>
        <span className="absolute h-3 w-3 rounded-full" style={{ backgroundColor: MINT }} />
      </span>
    </div>
  );
}

/** A line-chart "Track Sales" card, dark, with a hovered data-point chip. */
function TrackSalesCard() {
  return (
    <div
      className="relative flex flex-col rounded-[18px] p-6"
      style={{ backgroundColor: INK }}
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-white/10 px-4 py-1.5 text-small font-[600] text-white">
          Track Sales
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
      <div className="relative mt-6 h-32">
        <svg viewBox="0 0 320 130" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <polyline
            points="0,95 45,70 90,80 135,40 180,55 225,30 270,60 320,35"
            fill="none"
            stroke={MINT}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="0,70 45,85 90,55 135,75 180,45 225,65 270,40 320,70"
            fill="none"
            stroke="#7c83b8"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line x1="180" y1="0" x2="180" y2="130" stroke="white" strokeOpacity="0.25" strokeWidth="1.5" />
          <circle cx="180" cy="45" r="5" fill="white" />
        </svg>
        <span className="absolute left-[48%] top-1 rounded-full bg-white px-3 py-1 text-caption font-[700] text-[color:var(--ink)]" style={{ ["--ink" as string]: INK }}>
          ₦450k
        </span>
      </div>
    </div>
  );
}

/** A two-column bento row beneath the hero: stat card + metrics card. */
function HeroBento() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <TrackSalesCard />

      {/* Tan "businesses onboarded" card */}
      <div className="flex flex-col justify-between rounded-[18px] p-6" style={{ backgroundColor: TAN, color: INK }}>
        <div className="flex items-center justify-between">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
            <Play className="h-5 w-5 translate-x-0.5 fill-current" />
          </span>
          <div className="flex -space-x-3">
            {["#3544a8", "#10a769", "#0d0f17"].map((c) => (
              <span
                key={c}
                className="h-9 w-9 rounded-full border-2 border-[color:var(--tan)]"
                style={{ backgroundColor: c, ["--tan" as string]: TAN }}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="text-small font-[600] text-black/60">Businesses onboarded</p>
          <p className="mt-1 text-[40px] font-[800] leading-none tabular">10,000+</p>
        </div>
      </div>

      {/* Lavender "metrics" card */}
      <div className="flex flex-col justify-between rounded-[18px] p-6" style={{ backgroundColor: LAVENDER, color: INK }}>
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-caption font-[700]">
            <Activity className="h-3.5 w-3.5" />
            34 metrics
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/10">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
        <p className="text-h1 font-[800] leading-tight tracking-[-0.02em]">
          Easily track every business metric
        </p>
      </div>
    </div>
  );
}

/** The full dark hero "screen" — nav, mint panel and bento row in one card. */
function HeroScreen() {
  return (
    <section className="px-3 pt-3 sm:px-5 sm:pt-5">
      <div
        className="mx-auto max-w-content rounded-[28px] p-2.5 sm:p-3"
        style={{ backgroundColor: INK }}
      >
        <HeroNav />
        <div className="space-y-3 p-1 sm:p-1.5">
          <HeroPanel />
          <HeroBento />
        </div>
      </div>
    </section>
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
          <Logo label="TrustOps AI" size={28} wordmarkClassName="text-h3 text-white" />
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
      <HeroScreen />
      <Features />
      <Trust />
      <FinalCta />
      <Footer />
    </main>
  );
}
