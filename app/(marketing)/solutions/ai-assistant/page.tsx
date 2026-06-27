import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  FileText,
  Lock,
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
import { BRAND_GRADIENT } from "@/components/marketing/brand";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "AI Assistant · TrustOps AI",
  description:
    "Ask your business anything in plain language. The TrustOps AI Assistant, powered by Claude, turns your data into answers, alerts, and restock advice.",
};

const CAPABILITIES = [
  {
    icon: MessageSquare,
    title: "Ask in plain language",
    body: "“What were my top 5 products last month?” Get a clear answer instantly — no formulas, no filters.",
  },
  {
    icon: TrendingUp,
    title: "Spot the trends",
    body: "It reads your revenue, stock, and payments to surface what's growing and what's slipping.",
  },
  {
    icon: AlertTriangle,
    title: "Catch problems early",
    body: "Anomaly detection flags unusual dips, low stock, and overdue invoices before they cost you.",
  },
  {
    icon: FileText,
    title: "Summarise & report",
    body: "Turn a messy week into a tidy summary you can act on, or hand to your accountant.",
  },
] as const;

const CHAT = [
  { role: "user", text: "How are sales doing this week?" },
  {
    role: "ai",
    text: "Sales are up 15% vs last week (₦1.24M). Cash is your top payment mode at 45%. Heads up — “Premium Rice 5kg” is down to 8 units and usually sells ~20/week.",
  },
  { role: "user", text: "What should I restock?" },
  {
    role: "ai",
    text: "Restock Premium Rice 5kg (order ~40) and Cooking Oil 1L (12 left). Both trend up before the weekend, so order today to avoid a stockout.",
  },
] as const;

const STEPS = [
  { n: "01", title: "It reads your data", body: "The assistant works from your live inventory, sales, and invoices — already in TrustOps." },
  { n: "02", title: "You ask a question", body: "Type anything in plain language, the way you'd ask a sharp business partner." },
  { n: "03", title: "You get an answer", body: "Clear, specific, and grounded in your numbers — with a recommended next step." },
];

export default function AiAssistantPage() {
  return (
    <>
      <PageHero
        eyebrow="AI Assistant"
        title="Your business,"
        highlight="decoded by AI"
        subtitle="Ask anything about your shop and get a clear answer in seconds. The TrustOps AI Assistant is grounded in your own data and powered by Claude."
        actions={
          <>
            <Link href="/signup" className={BTN_PRIMARY}>
              Try it free
              <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
            </Link>
            <Link href="/docs" className={BTN_GHOST}>
              Read the docs
            </Link>
          </>
        }
      />

      {/* Live chat preview */}
      <Section>
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <GlassCard className="p-5 sm:p-7">
              <div className="mb-5 flex items-center gap-3 border-b border-white/5 pb-4">
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl text-white", BRAND_GRADIENT)}>
                  <Sparkles className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-body-strong text-white">TrustOps Assistant</p>
                  <p className="text-caption text-emerald-300">● Online · grounded in your data</p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {CHAT.map((m, i) => (
                  <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                    <p
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2.5 text-small leading-relaxed",
                        m.role === "user"
                          ? "rounded-br-sm bg-white/10 text-white"
                          : "rounded-bl-sm border border-fuchsia-400/20 bg-fuchsia-500/5 text-white/80",
                      )}
                    >
                      {m.text}
                    </p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </Reveal>
        </div>
      </Section>

      <Section className="border-y border-white/5 bg-white/[0.015]">
        <SectionHeading
          title="More than a chatbot —"
          highlight="a co-pilot"
          subtitle="It doesn't just answer questions. It watches your business and tells you what to do next."
        />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {CAPABILITIES.map((c, i) => (
            <Reveal key={c.title} delay={(i % 2) * 0.08}>
              <GlassCard hover className="flex h-full items-start gap-5 p-7">
                <GradientIcon icon={c.icon} />
                <div>
                  <h3 className="text-h3 text-white">{c.title}</h3>
                  <p className="mt-2 text-body text-white/55">{c.body}</p>
                </div>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeading eyebrow="How it works" title="Three steps to" highlight="answers" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <Reveal key={s.n}>
              <GlassCard className="h-full p-8">
                <span className="font-display text-[40px] font-[600] leading-none text-white/10">{s.n}</span>
                <h3 className="mt-4 text-h3 text-white">{s.title}</h3>
                <p className="mt-2 text-body text-white/55">{s.body}</p>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Privacy */}
      <Section className="pt-0">
        <Reveal>
          <GlassCard className="flex flex-col items-start gap-5 p-8 sm:flex-row sm:items-center sm:p-10">
            <GradientIcon icon={Lock} />
            <div className="flex-1">
              <h3 className="text-h3 text-white">Your data stays yours</h3>
              <p className="mt-2 text-body text-white/55">
                The assistant only ever reads your own company&apos;s data, isolated at
                the database level. Your numbers are never used to train models, and
                you can bring your own Anthropic API key for full control.
              </p>
            </div>
            <Link href="/legal/privacy" className="shrink-0 text-small font-[600] text-fuchsia-300 hover:underline">
              Read our privacy policy →
            </Link>
          </GlassCard>
        </Reveal>
      </Section>

      <MarketingCTA
        title="Put an analyst in every shop."
        subtitle="The AI Assistant is included on the Growth plan and up. Start your free trial today."
      />
    </>
  );
}
