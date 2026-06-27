import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, Section, MarketingCTA } from "@/components/marketing/ui";
import { DocsBrowser } from "@/components/marketing/docs-browser";

export const metadata: Metadata = {
  title: "Documentation · TrustOps AI",
  description:
    "Guides and references for getting the most out of TrustOps AI — from setup to sales, inventory, AI, and analytics.",
};

export default function DocsPage() {
  return (
    <>
      <PageHero
        eyebrow="Documentation"
        title="Everything you need to"
        highlight="master TrustOps"
        subtitle="Clear, practical guides written for busy shop owners — not engineers. Search for a topic or browse by category."
      />

      <Section>
        <DocsBrowser />
      </Section>

      <Section className="border-t border-white/5 pt-12">
        <p className="text-center text-body text-white/55">
          Can&apos;t find what you&apos;re looking for?{" "}
          <Link href="/support/contact" className="font-[600] text-fuchsia-300 hover:underline">
            Contact our support team
          </Link>
          .
        </p>
      </Section>

      <MarketingCTA
        title="Learn by doing."
        subtitle="The fastest way to learn TrustOps is to use it. Start your free account today."
        ctaLabel="Create free account"
      />
    </>
  );
}
