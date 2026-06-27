import type { Metadata } from "next";
import Link from "next/link";
import {
  Users,
  MessagesSquare,
  CalendarDays,
  GraduationCap,
  Globe2,
  Handshake,
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

export const metadata: Metadata = {
  title: "Global SME Network · TrustOps AI",
  description:
    "Join thousands of African SME owners sharing playbooks, events, and support in the TrustOps Global SME Network.",
};

const BENEFITS = [
  { icon: MessagesSquare, title: "Peer forums", body: "Swap real playbooks with owners who've solved what you're facing — pricing, stock, staffing, growth." },
  { icon: CalendarDays, title: "Events & meetups", body: "Monthly virtual sessions and regional meetups across Lagos, Accra, Nairobi, and beyond." },
  { icon: GraduationCap, title: "Masterclasses", body: "Free workshops on inventory, cash flow, and using AI to make sharper decisions." },
  { icon: Handshake, title: "Partnerships", body: "Find suppliers, distributors, and collaborators inside a trusted network of vetted businesses." },
  { icon: Globe2, title: "Regional chapters", body: "Local communities that understand your market, currency, and customers." },
  { icon: Users, title: "Mentorship", body: "Connect with experienced founders who've scaled SMEs across the continent." },
] as const;

const STATS = [
  { to: 10000, decimals: 0, suffix: "+", label: "Members" },
  { to: 15, decimals: 0, suffix: "+", label: "Countries" },
  { to: 40, decimals: 0, suffix: "+", label: "Events a year" },
  { to: 4.9, decimals: 1, suffix: "/5", label: "Member rating" },
];

const FORUM_TOPICS = [
  "Managing stock across multiple branches",
  "Pricing strategies that survived inflation",
  "Getting customers to pay invoices on time",
  "What I asked the AI Assistant this week",
  "Hiring your first shop manager",
];

export default function CommunityPage() {
  return (
    <>
      <PageHero
        eyebrow="Community"
        title="The Global SME"
        highlight="Network"
        subtitle="You're not building alone. Join thousands of African business owners sharing what works, what doesn't, and what's next."
        actions={
          <>
            <Link href="/signup" className={BTN_PRIMARY}>
              Join the network
              <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
            </Link>
            <Link href="/solutions" className={BTN_GHOST}>
              Explore the platform
            </Link>
          </>
        }
      />

      {/* Stats */}
      <Section className="py-14">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08} className="text-center">
              <p className="font-display text-[34px] font-[600] tabular text-white sm:text-[40px]">
                <CountUp to={s.to} decimals={s.decimals} suffix={s.suffix} />
              </p>
              <p className="mt-1 text-small text-white/50">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section className="border-y border-white/5 bg-white/[0.015] pt-12">
        <SectionHeading
          title="Grow faster"
          highlight="together"
          subtitle="Membership is free for every TrustOps user — and packed with ways to learn and connect."
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b, i) => (
            <Reveal key={b.title} delay={(i % 3) * 0.08}>
              <GlassCard hover className="h-full p-8">
                <GradientIcon icon={b.icon} />
                <h3 className="mt-5 text-h3 text-white">{b.title}</h3>
                <p className="mt-2 text-body text-white/55">{b.body}</p>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Forum preview */}
      <Section>
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="mb-4 text-caption uppercase tracking-[0.12em] text-fuchsia-300/80">Inside the forums</p>
            <h2 className="font-display text-metric font-[600] tracking-[-0.02em] text-white sm:text-[36px]">
              Real questions. Real answers. From people who get it.
            </h2>
            <p className="mt-4 text-body text-white/55">
              Every day, members trade hard-won lessons. No fluff, no gurus —
              just operators helping operators run better businesses.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <GlassCard className="p-4 sm:p-6">
              <ul className="flex flex-col">
                {FORUM_TOPICS.map((t, i) => (
                  <li
                    key={t}
                    className={`flex items-center justify-between gap-4 py-4 ${i !== FORUM_TOPICS.length - 1 ? "border-b border-white/5" : ""}`}
                  >
                    <span className="flex items-center gap-3 text-small text-white/75">
                      <MessagesSquare className="h-4 w-4 shrink-0 text-fuchsia-300/80" aria-hidden="true" />
                      {t}
                    </span>
                    <span className="shrink-0 text-caption text-white/30">
                      {12 + i * 7} replies
                    </span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          </Reveal>
        </div>
      </Section>

      <MarketingCTA
        title="Your network is your net worth."
        subtitle="Create a free TrustOps account and you're in the Global SME Network."
        ctaLabel="Join free today"
      />
    </>
  );
}
