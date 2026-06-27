import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageSquare, Clock, BookOpen, Users } from "lucide-react";
import {
  PageHero,
  Section,
  GlassCard,
  GradientIcon,
} from "@/components/marketing/ui";
import { Reveal } from "@/components/marketing/motion";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = {
  title: "Contact Support · TrustOps AI",
  description:
    "Get help from the TrustOps team. Reach us by email, browse the docs, or send us a message.",
};

const CHANNELS = [
  { icon: Mail, title: "Email us", body: "support@trustops.ai", note: "Best for account and billing questions." },
  { icon: Clock, title: "Response time", body: "Within 24 hours", note: "Priority support on Growth and up." },
  { icon: MessageSquare, title: "Support hours", body: "Mon–Sat, 8am–8pm WAT", note: "We're on West Africa Time." },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Support"
        title="We're here to"
        highlight="help"
        subtitle="Real people who know the product. Tell us what's going on and we'll get you back to business."
      />

      <Section>
        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {CHANNELS.map((c) => (
            <Reveal key={c.title}>
              <GlassCard className="flex h-full flex-col p-7">
                <GradientIcon icon={c.icon} />
                <h3 className="mt-5 text-h3 text-white">{c.title}</h3>
                <p className="mt-1 text-body-strong text-fuchsia-200">{c.body}</p>
                <p className="mt-2 text-small text-white/45">{c.note}</p>
              </GlassCard>
            </Reveal>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
          <Reveal>
            <div>
              <h2 className="font-display text-metric font-[600] tracking-[-0.02em] text-white sm:text-[34px]">
                Send us a message
              </h2>
              <p className="mt-3 text-body text-white/55">
                Fill in the form and we&apos;ll reply by email. The more detail you give
                us, the faster we can help.
              </p>
              <div className="mt-6">
                <ContactForm />
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="flex flex-col gap-4">
              <p className="text-caption uppercase tracking-[0.1em] text-fuchsia-300/80">Before you write</p>
              <Link href="/docs">
                <GlassCard hover className="flex items-start gap-4 p-6">
                  <GradientIcon icon={BookOpen} />
                  <div>
                    <h3 className="text-body-strong text-white">Browse the docs</h3>
                    <p className="mt-1 text-small text-white/50">Step-by-step guides answer most questions instantly.</p>
                  </div>
                </GlassCard>
              </Link>
              <Link href="/community">
                <GlassCard hover className="flex items-start gap-4 p-6">
                  <GradientIcon icon={Users} />
                  <div>
                    <h3 className="text-body-strong text-white">Ask the community</h3>
                    <p className="mt-1 text-small text-white/50">Learn from thousands of SME owners in the network.</p>
                  </div>
                </GlassCard>
              </Link>
              <Link href="/pricing">
                <GlassCard hover className="flex items-start gap-4 p-6">
                  <GradientIcon icon={MessageSquare} />
                  <div>
                    <h3 className="text-body-strong text-white">Pricing questions?</h3>
                    <p className="mt-1 text-small text-white/50">See plans and the FAQ on our pricing page.</p>
                  </div>
                </GlassCard>
              </Link>
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
