import Link from "next/link";
import {
  Package,
  ScanLine,
  Sparkles,
  LineChart,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Store,
  Truck,
  UtensilsCrossed,
  Dumbbell,
  ShoppingBag,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/logo";

/**
 * Public marketing landing page (route "/"). Outside the (app) and (auth) route
 * groups, so it renders on the bare root layout — no app shell, no auth gate.
 * Static and server-rendered; the only interactions are links.
 *
 * One palette across the whole product: the brand indigo token warmed through
 * Tailwind violet → fuchsia (the same gradient as the auth page and app accent).
 * The look is depth-forward — gradient washes, glassy 3D cards, layered shadows,
 * and hover lift — so the page reads as a single, cohesive composition.
 */

// The signature gradient, reused on every accent surface for consistency.
const BRAND_GRADIENT = "bg-gradient-to-br from-primary-700 via-violet-700 to-fuchsia-600";

function Nav() {
  return (
    <nav className="relative z-20 mx-auto flex max-w-content items-center justify-between px-4 py-5 sm:px-6">
      <Link href="/" aria-label="TrustOps AI home">
        <Logo label="TrustOps AI" size={30} wordmarkClassName="text-white text-h2" />
      </Link>
      <div className="hidden items-center gap-8 md:flex">
        {["Solutions", "AI Assistant", "Analytics", "Pricing"].map((item) => (
          <a
            key={item}
            href="#features"
            className="text-small font-[600] text-white/70 transition-colors hover:text-white"
          >
            {item}
          </a>
        ))}
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/login"
          className="hidden rounded-full px-4 py-2 text-small font-[600] text-white/80 transition-colors hover:text-white sm:inline-flex"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-small font-[700] text-primary-700 shadow-lg transition-transform hover:-translate-y-0.5"
        >
          Get Started
        </Link>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className={`relative overflow-hidden ${BRAND_GRADIENT}`}>
      {/* Ambient gradient glows for depth */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-fuchsia-400/30 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-52 right-0 h-[34rem] w-[34rem] rounded-full bg-violet-500/30 blur-3xl" aria-hidden="true" />
      {/* Fine grid sheen */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
        aria-hidden="true"
      />

      <Nav />

      <div className="relative mx-auto grid max-w-content grid-cols-1 items-center gap-14 px-4 pb-28 pt-10 sm:px-6 lg:grid-cols-2 lg:pt-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-caption font-[600] uppercase tracking-[0.12em] text-white backdrop-blur">
            <ShieldCheck className="h-4 w-4" />
            Business Operating System
          </span>
          <h1 className="mt-6 text-[44px] font-[800] leading-[1.05] tracking-[-0.03em] text-white sm:text-[60px]">
            We make your
            <br />
            business{" "}
            <span className="bg-gradient-to-r from-fuchsia-200 via-white to-violet-200 bg-clip-text text-transparent">
              unstoppable
            </span>
          </h1>
          <p className="mt-6 max-w-lg text-[17px] leading-[28px] text-white/80">
            Inventory, sales, and AI-powered insights in one secure operating
            system. Built for modern African SMEs that want to grow.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-[15px] font-[700] text-primary-700 shadow-xl transition-transform hover:-translate-y-0.5"
            >
              Get Started for Free
              <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-8 py-4 text-[15px] font-[700] text-white backdrop-blur transition-colors hover:bg-white/20"
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

/** A 3D-tilted glass dashboard preview with floating gradient stat chips. */
function HeroPreview() {
  return (
    <div className="relative [perspective:1600px]" aria-hidden="true">
      <div className="relative rounded-[28px] border border-white/20 bg-white/95 p-6 shadow-2xl [transform:rotateY(-12deg)_rotateX(6deg)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-caption uppercase tracking-[0.08em] text-text-muted">
              Revenue
            </p>
            <p className="mt-1 text-metric tabular text-text-primary">₦4.2M</p>
          </div>
          <span className="rounded-full bg-success-50 px-3 py-1 text-caption font-[700] text-success-700">
            ▲ 18.2%
          </span>
        </div>

        {/* Gradient area chart */}
        <div className="mt-5 h-40 w-full overflow-hidden rounded-2xl bg-gray-50 p-3">
          <svg viewBox="0 0 360 130" preserveAspectRatio="none" className="h-full w-full">
            <defs>
              <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary-500)" stopOpacity="0.45" />
                <stop offset="100%" stopColor="var(--color-primary-500)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="stroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--color-primary-600)" />
                <stop offset="100%" stopColor="#c026d3" />
              </linearGradient>
            </defs>
            <path d="M0,100 60,80 120,90 180,50 240,62 300,30 360,42 360,130 0,130 Z" fill="url(#area)" />
            <polyline
              points="0,100 60,80 120,90 180,50 240,62 300,30 360,42"
              fill="none"
              stroke="url(#stroke)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            { label: "Orders", value: "1,204" },
            { label: "Customers", value: "842" },
          ].map((m) => (
            <div key={m.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-caption uppercase tracking-[0.04em] text-text-muted">{m.label}</p>
              <p className="mt-1 text-h2 tabular text-text-primary">{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Floating gradient chip — depth in front of the card */}
      <div className="absolute -bottom-6 -left-4 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-2xl sm:-left-8">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${BRAND_GRADIENT} text-white shadow-lg`}>
          <TrendingUp className="h-5 w-5" />
        </span>
        <div>
          <p className="text-caption uppercase tracking-[0.04em] text-text-muted">Today</p>
          <p className="text-body-strong tabular text-text-primary">₦450,000</p>
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

/** Gradient icon tile — the recurring 3D accent across feature cards. */
function GradientIcon({ icon: Icon }: { icon: typeof Package }) {
  return (
    <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${BRAND_GRADIENT} text-white shadow-lg`}>
      <Icon className="h-6 w-6" aria-hidden="true" />
    </span>
  );
}

const featureCard =
  "flex flex-col justify-between rounded-3xl border border-gray-100 bg-surface-card p-8 shadow-xl transition-transform duration-base hover:-translate-y-1";

function Features() {
  return (
    <section
      id="features"
      className="relative bg-gradient-to-b from-white to-primary-50 py-28"
    >
      <div className="mx-auto max-w-content px-4 sm:px-6">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="text-metric tracking-[-0.02em] text-text-primary sm:text-[40px]">
            Powerful tools,{" "}
            <span className="bg-gradient-to-r from-primary-600 to-fuchsia-600 bg-clip-text text-transparent">
              simply designed
            </span>
          </h2>
          <p className="mt-4 text-body text-text-secondary">
            Everything you need to manage your operations without the cognitive
            overload.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Smart Inventory — wide */}
          <div className={`${featureCard} md:col-span-2`}>
            <div className="mb-8">
              <GradientIcon icon={BENTO.inventory.icon} />
              <h3 className="mt-5 text-h3 text-text-primary">{BENTO.inventory.title}</h3>
              <p className="mt-2 text-body text-text-secondary">{BENTO.inventory.body}</p>
            </div>
            <div className="mt-auto flex h-48 items-end justify-between gap-2 rounded-2xl bg-gray-50 p-4">
              {[35, 55, 42, 68, 50, 75, 60, 88].map((h, i) => (
                <div
                  key={i}
                  className="w-full rounded-t-md bg-gradient-to-t from-primary-500 to-fuchsia-400"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>

          {/* Atomic Sales */}
          <div className={featureCard}>
            <div>
              <GradientIcon icon={BENTO.sales.icon} />
              <h3 className="mt-5 text-h3 text-text-primary">{BENTO.sales.title}</h3>
              <p className="mt-2 text-body text-text-secondary">{BENTO.sales.body}</p>
            </div>
            <Link
              href="/signup"
              className={`mt-8 flex w-full items-center justify-center gap-2 rounded-full ${BRAND_GRADIENT} px-4 py-3 text-[15px] font-[700] text-white shadow-lg transition-transform hover:-translate-y-0.5`}
            >
              Record Sale
              <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
            </Link>
          </div>

          {/* AI Assistant */}
          <div className={featureCard}>
            <div>
              <GradientIcon icon={BENTO.ai.icon} />
              <h3 className="mt-5 text-h3 text-text-primary">{BENTO.ai.title}</h3>
              <p className="mt-2 text-body text-text-secondary">{BENTO.ai.body}</p>
            </div>
            <div className="mt-8 rounded-2xl border border-primary-100 bg-primary-50 p-4">
              <p className="text-small italic text-text-secondary">
                &ldquo;Sales are up 15% this week. Consider restocking item
                XYZ.&rdquo;
              </p>
            </div>
          </div>

          {/* Global Analytics — wide */}
          <div className={`${featureCard} md:col-span-2`}>
            <div className="mb-8">
              <GradientIcon icon={BENTO.analytics.icon} />
              <h3 className="mt-5 text-h3 text-text-primary">{BENTO.analytics.title}</h3>
              <p className="mt-2 text-body text-text-secondary">{BENTO.analytics.body}</p>
            </div>
            <div className="mt-auto h-48 w-full overflow-hidden rounded-2xl bg-gray-50 p-3">
              <svg viewBox="0 0 400 160" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
                <defs>
                  <linearGradient id="analytics-stroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--color-primary-600)" />
                    <stop offset="100%" stopColor="#c026d3" />
                  </linearGradient>
                </defs>
                <polyline
                  points="0,130 60,110 120,120 180,70 240,85 300,40 360,55 400,20"
                  fill="none"
                  stroke="url(#analytics-stroke)"
                  strokeWidth="3.5"
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
    <section className="bg-primary-50 py-20">
      <div className="mx-auto max-w-content px-4 text-center sm:px-6">
        <p className="mb-8 text-caption uppercase tracking-[0.1em] text-text-muted">
          Trusted by 10,000+ businesses across Nigeria and beyond
        </p>
        <div className="flex flex-wrap items-center justify-center gap-12 text-primary-300">
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
    <section className="bg-primary-50 px-4 pb-28 pt-8 sm:px-6">
      <div className={`relative mx-auto max-w-content overflow-hidden rounded-[2.5rem] ${BRAND_GRADIENT} px-6 py-20 text-center shadow-2xl`}>
        <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-fuchsia-300/30 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-violet-400/30 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto max-w-2xl">
          <h2 className="text-metric-lg tracking-[-0.02em] text-white sm:text-[44px]">
            Join the future of SME operations.
          </h2>
          <p className="mt-5 text-[17px] leading-[28px] text-white/85">
            Stop wrestling with spreadsheets. Start growing with TrustOps AI.
          </p>
          <Link
            href="/signup"
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-white px-10 py-4 text-[15px] font-[700] text-primary-700 shadow-xl transition-transform hover:-translate-y-0.5"
          >
            Build Your Business Today
            <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
          </Link>
        </div>
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
    <footer className="bg-primary-900 py-14">
      <div className="mx-auto flex max-w-content flex-col justify-between gap-10 px-4 sm:px-6 md:flex-row">
        <div>
          <span className="flex items-center gap-2">
            <LogoMark size={28} />
            <span className="text-h3 font-[700] text-white">TrustOps AI</span>
          </span>
          <p className="mt-4 max-w-xs text-small text-primary-200">
            © {new Date().getFullYear()} TrustOps AI. Empowering African SMEs.
          </p>
        </div>
        <nav className="flex flex-col gap-8 md:flex-row md:gap-12" aria-label="Footer">
          {columns.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <span className="text-caption uppercase tracking-[0.05em] text-fuchsia-300">
                {col.title}
              </span>
              {col.links.map((link) => (
                <a
                  key={link}
                  href="#"
                  className="text-small text-primary-200 transition-colors hover:text-white"
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
      <Hero />
      <Features />
      <Trust />
      <FinalCta />
      <Footer />
    </main>
  );
}
