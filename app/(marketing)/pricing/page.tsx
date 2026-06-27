import type { Metadata } from "next";
import { ShieldCheck, Zap, HeartHandshake } from "lucide-react";
import {
  PageHero,
  SectionHeading,
  Section,
  GlassCard,
  GradientIcon,
  MarketingCTA,
} from "@/components/marketing/ui";
import { Reveal } from "@/components/marketing/motion";
import { PricingPlans } from "@/components/marketing/pricing-plans";
import { Faq } from "@/components/marketing/faq";

export const metadata: Metadata = {
  title: "Pricing · TrustOps AI",
  description:
    "Simple, transparent pricing in Naira. Start free, upgrade as you grow. No hidden fees, cancel anytime.",
};

const ASSURANCES = [
  { icon: Zap, title: "14-day free trial", body: "Try every paid feature free. No credit card required to start." },
  { icon: HeartHandshake, title: "Cancel anytime", body: "No lock-in and no penalties. Downgrade or leave whenever you like." },
  { icon: ShieldCheck, title: "Your data is yours", body: "Bank-grade isolation, and a full export of your data on request." },
];

const FAQS = [
  {
    q: "Can I change plans later?",
    a: "Yes. Upgrade or downgrade at any time from your settings — changes take effect immediately and we pro-rate the difference.",
  },
  {
    q: "What happens after the free trial?",
    a: "You keep full access for 14 days. After that you pick a plan to continue, or stay on the free Starter plan with reduced limits. Nothing is deleted.",
  },
  {
    q: "Do you support Naira payments?",
    a: "Absolutely. Pricing and billing are in Naira, and your customers can pay you by cash, bank transfer, or card.",
  },
  {
    q: "Is the AI Assistant included?",
    a: "The AI Assistant is included from the Growth plan upward. You can also connect your own Anthropic API key for full control.",
  },
  {
    q: "Can I add my whole team?",
    a: "Yes. Starter includes 1 user, Growth includes 5, and Scale and Enterprise are unlimited — each with role-based permissions.",
  },
];

export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Simple pricing that grows"
        highlight="with you"
        subtitle="Start free, upgrade when you're ready. Every plan includes the core operating system — no hidden fees, cancel anytime."
      />

      <Section className="pt-12">
        <PricingPlans />
      </Section>

      <Section className="pt-0">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {ASSURANCES.map((a) => (
            <Reveal key={a.title}>
              <GlassCard className="flex h-full items-start gap-4 p-7">
                <GradientIcon icon={a.icon} />
                <div>
                  <h3 className="text-h3 text-white">{a.title}</h3>
                  <p className="mt-2 text-small text-white/55">{a.body}</p>
                </div>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section className="border-t border-white/5">
        <SectionHeading title="Questions," highlight="answered" />
        <Faq items={FAQS} />
      </Section>

      <MarketingCTA
        title="Ready when you are."
        subtitle="Join 10,000+ businesses running on TrustOps. Start free in minutes."
      />
    </>
  );
}
