import Link from "next/link";
import {
  ReceiptText,
  Users,
  Package,
  WalletCards,
  BarChart3,
  Sparkles,
  ShieldCheck,
  Building2,
  Smartphone,
  ArrowRight,
  Check,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";

/**
 * Public marketing landing page (route "/"). Outside the (app) and (auth) route
 * groups, so it renders on the bare root layout — no app shell, no auth gate.
 * Static and server-rendered; the only interactions are links. Visual language
 * mirrors the app design system (indigo brand, token type scale, soft shadows).
 */

const FEATURES = [
  {
    icon: ReceiptText,
    title: "Sales & invoicing",
    body: "Record a sale in seconds and turn it into a clean, professional invoice automatically.",
  },
  {
    icon: Users,
    title: "Customers",
    body: "Keep every customer's history, contact details, and outstanding balance in one place.",
  },
  {
    icon: Package,
    title: "Inventory & stock",
    body: "Track products across branches with automatic low-stock alerts before you run out.",
  },
  {
    icon: WalletCards,
    title: "Expenses",
    body: "Log business spending by category and see exactly where your money goes.",
  },
  {
    icon: BarChart3,
    title: "Analytics & reports",
    body: "Revenue, profit, and cash flow at a glance — export a period report whenever you need it.",
  },
  {
    icon: Sparkles,
    title: "AI assistant",
    body: "Ask about your business in plain language and get answers grounded in your own data.",
  },
] as const;

const STEPS = [
  {
    n: "1",
    title: "Create your company",
    body: "Sign up in under a minute. Your data is private to your business from the first click.",
  },
  {
    n: "2",
    title: "Add products & customers",
    body: "Set up what you sell and who you sell to — or just start recording sales right away.",
  },
  {
    n: "3",
    title: "Run your day",
    body: "Record sales, send invoices, watch stock, and let the assistant surface what matters.",
  },
] as const;

const TRUST = [
  {
    icon: ShieldCheck,
    title: "Your data is isolated",
    body: "Every company is fully separated at the database level — your records are never visible to anyone else.",
  },
  {
    icon: Building2,
    title: "Multi-branch ready",
    body: "Manage stock and sales across multiple branches from a single account.",
  },
  {
    icon: Smartphone,
    title: "Works on any device",
    body: "A fast, responsive interface built for the phone in your pocket and the desktop on your counter.",
  },
] as const;

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface-card/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-h2 font-[700] text-primary-600">
          TrustOps
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Primary">
          <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
            Log in
          </Link>
          <Link href="/signup" className={buttonVariants()}>
            Create a company
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 to-surface-page">
      <div className="mx-auto max-w-content px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-surface-card px-3 py-1 text-caption text-primary-700">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            The operating system for African SMEs
          </span>
          <h1 className="mt-5 text-display-lg text-text-primary sm:text-[44px] sm:leading-[50px]">
            Run your whole business in one place.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-body text-text-secondary sm:text-[17px] sm:leading-[28px]">
            Record sales, send invoices, track stock, manage customers, and get
            AI-powered insights — all from one simple app built for small and
            growing businesses.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className={buttonVariants({ size: "lg" }) + " w-full sm:w-auto"}
            >
              Create a company
              <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              className={
                buttonVariants({ variant: "secondary", size: "lg" }) +
                " w-full sm:w-auto"
              }
            >
              Log in
            </Link>
          </div>
          <p className="mt-4 text-small text-text-muted">
            Free to start · No card required
          </p>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}

/** A static, decorative mock of the app dashboard to anchor the hero. */
function HeroPreview() {
  return (
    <div className="mx-auto mt-14 max-w-4xl" aria-hidden="true">
      <div className="rounded-lg border border-border-subtle bg-surface-card p-3 shadow-lg sm:p-4">
        <div className="mb-3 flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-gray-200" />
          <span className="h-3 w-3 rounded-full bg-gray-200" />
          <span className="h-3 w-3 rounded-full bg-gray-200" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Today's revenue", value: "₦184,500", tone: "text-success-700" },
            { label: "Unpaid total", value: "₦42,000", tone: "text-text-primary" },
            { label: "Customers", value: "128", tone: "text-text-primary" },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-md border border-border-subtle bg-surface-page p-4"
            >
              <p className="text-caption text-text-muted">{m.label}</p>
              <p className={`mt-1 text-metric tabular ${m.tone}`}>{m.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-md border border-border-subtle bg-surface-page p-4">
          <div className="flex items-center justify-between">
            <p className="text-body-strong text-text-primary">Recent sales</p>
            <span className="text-small text-primary-600">View all</span>
          </div>
          <div className="mt-3 space-y-2">
            {["INV-1042 · Ada Stores", "INV-1041 · Musa Traders", "INV-1040 · Bright Mart"].map(
              (row, i) => (
                <div
                  key={row}
                  className="flex items-center justify-between rounded-sm bg-surface-card px-3 py-2"
                >
                  <span className="text-small text-text-secondary">{row}</span>
                  <span className="text-small tabular text-text-primary">
                    {["₦24,000", "₦9,500", "₦57,200"][i]}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Features() {
  return (
    <section className="mx-auto max-w-content px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-display text-text-primary">
          Everything your business needs
        </h2>
        <p className="mt-3 text-body text-text-secondary">
          One connected toolkit instead of scattered notebooks, spreadsheets,
          and chat threads.
        </p>
      </div>
      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="rounded-lg border border-border-subtle bg-surface-card p-6 shadow-sm transition-shadow duration-base ease-out hover:shadow-md"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-primary-50 text-primary-600">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-h3 text-text-primary">{f.title}</h3>
              <p className="mt-1.5 text-body text-text-secondary">{f.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="border-y border-border-subtle bg-surface-card">
      <div className="mx-auto max-w-content px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-display text-text-primary">Up and running today</h2>
          <p className="mt-3 text-body text-text-secondary">
            No setup project, no consultants. Three steps and you&apos;re live.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n}>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-h3 text-text-on-primary">
                {s.n}
              </span>
              <h3 className="mt-4 text-h3 text-text-primary">{s.title}</h3>
              <p className="mt-1.5 text-body text-text-secondary">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Trust() {
  return (
    <section className="mx-auto max-w-content px-4 py-16 sm:px-6 sm:py-20">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {TRUST.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.title} className="flex gap-4">
              <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-success-50 text-success-700">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-h3 text-text-primary">{t.title}</h3>
                <p className="mt-1 text-body text-text-secondary">{t.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-4 pb-16 sm:px-6 sm:pb-20">
      <div className="mx-auto max-w-content overflow-hidden rounded-lg bg-primary-600 px-6 py-14 text-center sm:px-12">
        <h2 className="text-display text-text-on-primary">
          Start running your business the simple way
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-body text-primary-100">
          Create your company in under a minute and record your first sale today.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-surface-card px-6 text-[15px] font-[600] text-primary-700 transition-colors duration-fast ease-in-out hover:bg-primary-50 sm:w-auto"
          >
            Create a company
            <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 w-full items-center justify-center rounded-md border border-primary-300 px-6 text-[15px] font-[600] text-text-on-primary transition-colors duration-fast ease-in-out hover:bg-primary-700 sm:w-auto"
          >
            Log in
          </Link>
        </div>
        <ul className="mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {["Free to start", "No card required", "Your data stays private"].map(
            (item) => (
              <li
                key={item}
                className="inline-flex items-center gap-1.5 text-small text-primary-100"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                {item}
              </li>
            ),
          )}
        </ul>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border-subtle bg-surface-card">
      <div className="mx-auto flex max-w-content flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <span className="text-body-strong text-primary-600">TrustOps</span>
        <nav className="flex items-center gap-6" aria-label="Footer">
          <Link href="/login" className="text-small text-text-secondary hover:text-text-primary">
            Log in
          </Link>
          <Link href="/signup" className="text-small text-text-secondary hover:text-text-primary">
            Create a company
          </Link>
        </nav>
        <p className="text-small text-text-muted">
          © {new Date().getFullYear()} TrustOps. All rights reserved.
        </p>
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
      <HowItWorks />
      <Trust />
      <FinalCta />
      <Footer />
    </main>
  );
}
