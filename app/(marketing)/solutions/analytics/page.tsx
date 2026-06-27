import type { Metadata } from "next";
import Link from "next/link";
import {
  TrendingUp,
  PieChart,
  GitCompare,
  Download,
  Boxes,
  Gauge,
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
import { Reveal, CountUp } from "@/components/marketing/motion";
import {
  AreaChart,
  BarChart,
  LineChart,
  DonutChart,
} from "@/components/marketing/charts";

export const metadata: Metadata = {
  title: "Analytics · TrustOps AI",
  description:
    "Revenue trends, payment mix, top products, and branch comparisons — see your whole business at a glance, then export the numbers you need.",
};

const FEATURES = [
  { icon: TrendingUp, title: "Revenue trends", body: "Track revenue over time and compare against last year at a glance." },
  { icon: PieChart, title: "Payment mix", body: "See exactly how customers pay — cash, transfer, or card — in real time." },
  { icon: Boxes, title: "Top products", body: "Know your best sellers and slow movers so you stock what actually sells." },
  { icon: GitCompare, title: "Branch comparison", body: "Put every location side by side and spot which one needs attention." },
  { icon: Download, title: "One-click exports", body: "Export any report to PDF for your accountant, bank, or board." },
  { icon: Gauge, title: "Live dashboards", body: "Numbers update the moment a sale is recorded — no refresh, no lag." },
] as const;

const STATS = [
  { to: 99.9, decimals: 1, suffix: "%", label: "Data accuracy" },
  { prefix: "₦", to: 2.4, decimals: 1, suffix: "B+", label: "Tracked annually" },
  { to: 0, decimals: 0, suffix: "s", label: "Reporting lag", prefix: "~" },
  { to: 12, decimals: 0, suffix: "+", label: "Report types" },
];

export default function AnalyticsPage() {
  return (
    <>
      <PageHero
        eyebrow="Analytics"
        title="See your whole business"
        highlight="at a glance"
        subtitle="Beautiful, real-time analytics that turn your day-to-day operations into decisions. No spreadsheets, no waiting for month-end."
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

      {/* Chart showcase */}
      <Section>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <GlassCard className="h-full p-7">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-caption uppercase tracking-[0.08em] text-white/50">Revenue · This month</p>
                  <p className="mt-1 font-display text-[28px] font-[600] tabular text-white">₦4.2M</p>
                </div>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-caption font-[700] text-emerald-300">▲ 18.2%</span>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <AreaChart />
              </div>
            </GlassCard>
          </Reveal>
          <Reveal delay={0.1}>
            <GlassCard className="flex h-full flex-col p-7">
              <p className="text-caption uppercase tracking-[0.08em] text-white/50">Payment mix</p>
              <div className="mt-auto pt-6">
                <DonutChart />
              </div>
            </GlassCard>
          </Reveal>
          <Reveal>
            <GlassCard className="h-full p-7">
              <p className="mb-3 text-caption uppercase tracking-[0.08em] text-white/50">Inventory movement</p>
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <BarChart />
              </div>
            </GlassCard>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-2">
            <GlassCard className="h-full p-7">
              <p className="mb-3 text-caption uppercase tracking-[0.08em] text-white/50">Year over year</p>
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <LineChart />
              </div>
            </GlassCard>
          </Reveal>
        </div>
      </Section>

      <Section className="border-y border-white/5 bg-white/[0.015]">
        <SectionHeading
          title="Every metric that"
          highlight="moves the needle"
          subtitle="The reports African SMEs actually use — clear, fast, and exportable."
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.08}>
              <GlassCard hover className="h-full p-8">
                <GradientIcon icon={f.icon} />
                <h3 className="mt-5 text-h3 text-white">{f.title}</h3>
                <p className="mt-2 text-body text-white/55">{f.body}</p>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08} className="text-center">
              <p className="font-display text-[34px] font-[600] tabular text-white sm:text-[40px]">
                <CountUp to={s.to} decimals={s.decimals} prefix={s.prefix} suffix={s.suffix} />
              </p>
              <p className="mt-1 text-small text-white/50">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      <MarketingCTA
        title="Know your numbers. Grow with confidence."
        subtitle="Full analytics are included on Growth and up. Start your free trial today."
      />
    </>
  );
}
