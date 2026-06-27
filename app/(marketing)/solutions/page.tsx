import type { Metadata } from "next";
import Link from "next/link";
import {
  Package,
  ScanLine,
  FileText,
  Orbit,
  BarChart3,
  WalletCards,
  Store,
  Truck,
  UtensilsCrossed,
  Dumbbell,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
import {
  PageHero,
  SectionHeading,
  Section,
  GlassCard,
  GradientIcon,
  MarketingCTA,
  BTN_PRIMARY,
  BTN_GHOST,
} from "@/components/marketing/ui";
import { Reveal } from "@/components/marketing/motion";

export const metadata: Metadata = {
  title: "Solutions · TrustOps AI",
  description:
    "One operating system for inventory, sales, invoicing, expenses, analytics and AI — built for African SMEs.",
};

const SOLUTIONS = [
  {
    icon: Package,
    title: "Smart Inventory",
    body: "Real-time stock across every branch, reorder points, and low-stock alerts so you never run dry or over-buy.",
  },
  {
    icon: ScanLine,
    title: "Atomic Sales",
    body: "Record a sale in seconds. Stock, revenue, and the customer ledger all update in one atomic step.",
  },
  {
    icon: FileText,
    title: "Invoicing",
    body: "Send professional invoices, track partial and overdue payments, and get paid by cash, transfer, or card.",
  },
  {
    icon: WalletCards,
    title: "Expenses",
    body: "Capture every cost against the right branch so your profit is the real number, not a guess.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    body: "Revenue trends, payment mix, and branch comparisons — the whole business at a glance.",
  },
  {
    icon: Orbit,
    title: "AI Assistant",
    body: "Ask questions in plain language and get answers, anomalies, and restock advice. Powered by Claude.",
  },
] as const;

const INDUSTRIES = [
  { icon: Store, label: "Retail & shops" },
  { icon: Truck, label: "Logistics" },
  { icon: UtensilsCrossed, label: "Food & beverage" },
  { icon: Dumbbell, label: "Fitness & wellness" },
  { icon: ShoppingBag, label: "Commerce" },
];

export default function SolutionsPage() {
  return (
    <>
      <PageHero
        eyebrow="Solutions"
        title="One platform for every part of your"
        highlight="business"
        subtitle="TrustOps replaces the spreadsheets, notebooks, and disconnected apps with a single operating system — so your stock, sales, money, and insights finally live in one place."
        actions={
          <>
            <Link href="/signup" className={BTN_PRIMARY}>
              Get Started for Free
              <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
            </Link>
            <Link href="/pricing" className={BTN_GHOST}>
              See pricing
            </Link>
          </>
        }
      />

      <Section>
        <SectionHeading
          title="Everything you need,"
          highlight="nothing you don't"
          subtitle="Six connected modules that share the same data — change something once and it's right everywhere."
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SOLUTIONS.map((s, i) => (
            <Reveal key={s.title} delay={(i % 3) * 0.08}>
              <GlassCard hover className="h-full p-8">
                <GradientIcon icon={s.icon} />
                <h3 className="mt-5 text-h3 text-white">{s.title}</h3>
                <p className="mt-2 text-body text-white/55">{s.body}</p>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section className="border-y border-white/5 bg-white/[0.015]">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="mb-4 text-caption uppercase tracking-[0.12em] text-fuchsia-300/80">
              Connected by design
            </p>
            <h2 className="font-display text-metric font-[600] tracking-[-0.02em] text-white sm:text-[40px]">
              When one thing changes, everything stays true.
            </h2>
            <p className="mt-4 text-body text-white/55">
              A sale lowers stock, books revenue, and updates the customer ledger
              in a single atomic step. No double entry. No drift between systems.
              No month-end reconciliation marathon.
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {[
                "One source of truth across every branch",
                "Role-based access for your whole team",
                "Bank-grade isolation — your data is only ever yours",
              ].map((point) => (
                <li key={point} className="flex items-start gap-3 text-body text-white/70">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-400" />
                  {point}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.1}>
            <GlassCard className="p-8">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { k: "Branches", v: "Unlimited" },
                  { k: "Setup time", v: "< 10 min" },
                  { k: "Payment modes", v: "3" },
                  { k: "Uptime SLA", v: "99.9%" },
                ].map((stat) => (
                  <div key={stat.k} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
                    <p className="font-display text-[28px] font-[600] text-white">{stat.v}</p>
                    <p className="mt-1 text-small text-white/45">{stat.k}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </Reveal>
        </div>
      </Section>

      <Section>
        <SectionHeading
          eyebrow="Built for your industry"
          title="Made for the businesses that"
          highlight="move Africa"
        />
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {INDUSTRIES.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 backdrop-blur-sm transition-colors hover:border-white/20 hover:bg-white/[0.07]"
            >
              <Icon className="h-[18px] w-[18px] text-fuchsia-300/90" strokeWidth={1.75} aria-hidden="true" />
              <span className="text-small font-[600] text-white/75">{label}</span>
            </span>
          ))}
        </div>
      </Section>

      <MarketingCTA
        title="Run your whole business in one place."
        subtitle="Start free in minutes — no credit card, no spreadsheets required."
      />
    </>
  );
}
