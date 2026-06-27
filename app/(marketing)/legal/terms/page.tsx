import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/ui";
import { LegalDoc, type LegalSection } from "@/components/marketing/legal-doc";

export const metadata: Metadata = {
  title: "Terms of Service · TrustOps AI",
  description:
    "The terms that govern your use of the TrustOps AI platform.",
};

const UPDATED = "27 June 2026";

const SECTIONS: LegalSection[] = [
  {
    heading: "Acceptance of terms",
    paragraphs: [
      "By creating an account or using TrustOps AI, you agree to these Terms of Service. If you are using TrustOps on behalf of a business, you confirm you are authorised to bind that business to these terms.",
    ],
  },
  {
    heading: "Your account",
    bullets: [
      "You are responsible for keeping your login credentials secure.",
      "You are responsible for activity that happens under your account and the accounts of team members you invite.",
      "You must provide accurate information and keep it up to date.",
    ],
  },
  {
    heading: "Acceptable use",
    paragraphs: ["You agree to use TrustOps lawfully and not to misuse the service."],
    bullets: [
      "Do not attempt to access data belonging to other businesses.",
      "Do not disrupt, reverse-engineer, or overload the service.",
      "Do not use TrustOps for any illegal or fraudulent activity.",
    ],
  },
  {
    heading: "Plans, billing & trials",
    paragraphs: [
      "Paid plans are billed in advance in Naira on a monthly or annual basis. Free trials convert to a paid plan only if you choose to continue. You can upgrade, downgrade, or cancel at any time; cancellations take effect at the end of the current billing period, and fees already paid are non-refundable except where required by law.",
    ],
  },
  {
    heading: "Your data & ownership",
    paragraphs: [
      "You own the business data you put into TrustOps. You grant us the limited rights needed to host and process it so we can provide the service. We will never sell your data, and you can export it at any time. See our Privacy Policy for full details.",
    ],
  },
  {
    heading: "Service availability",
    paragraphs: [
      "We work hard to keep TrustOps available and target 99.9% uptime, but we provide the service “as is” and cannot guarantee it will be uninterrupted or error-free. We may update or improve features over time.",
    ],
  },
  {
    heading: "Limitation of liability",
    paragraphs: [
      "To the maximum extent permitted by law, TrustOps is not liable for indirect or consequential losses. Our total liability for any claim is limited to the amount you paid us in the 12 months before the claim.",
    ],
  },
  {
    heading: "Termination",
    paragraphs: [
      "You may close your account at any time. We may suspend or terminate accounts that breach these terms. On termination, we will handle your data as described in our Privacy Policy.",
    ],
  },
  {
    heading: "Changes & contact",
    paragraphs: [
      "We may update these terms from time to time and will notify you of material changes. Questions? Email legal@trustops.ai or use our contact form.",
    ],
  },
];

export default function TermsPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Terms of"
        highlight="Service"
        subtitle="The plain-language agreement between you and TrustOps. No surprises, no fine-print traps."
      />
      <LegalDoc
        updated={UPDATED}
        intro="These Terms of Service govern your access to and use of the TrustOps AI platform. Please read them carefully — they form a binding agreement between you and TrustOps."
        sections={SECTIONS}
      />
    </>
  );
}
