import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/ui";
import { LegalDoc, type LegalSection } from "@/components/marketing/legal-doc";

export const metadata: Metadata = {
  title: "Privacy Policy · TrustOps AI",
  description:
    "How TrustOps AI collects, uses, and protects your business and personal data.",
};

const UPDATED = "27 June 2026";

const SECTIONS: LegalSection[] = [
  {
    heading: "Information we collect",
    paragraphs: [
      "We collect the information you give us and the information needed to run your business on TrustOps. We keep this to the minimum required to provide the service.",
    ],
    bullets: [
      "Account details: your name, email, role, and company information.",
      "Business data: the products, sales, invoices, customers, and expenses you record.",
      "Usage data: log and device information used to keep the service secure and reliable.",
    ],
  },
  {
    heading: "How we use your information",
    paragraphs: ["We use your information only to operate, secure, and improve TrustOps."],
    bullets: [
      "To provide the core features — inventory, sales, invoicing, analytics, and the AI Assistant.",
      "To secure your account and detect fraud or abuse.",
      "To provide support when you ask for it.",
      "To send essential service notices (you can opt out of marketing email at any time).",
    ],
  },
  {
    heading: "Data isolation & the AI Assistant",
    paragraphs: [
      "Your company's data is isolated at the database level — it is only ever accessible to your own authorised users.",
      "The AI Assistant operates strictly on your own company's data to answer your questions. Your business data is never used to train AI models. You may also connect your own Anthropic API key for full control over AI processing.",
    ],
  },
  {
    heading: "How we share information",
    paragraphs: [
      "We do not sell your personal or business data. We share it only with the service providers needed to run TrustOps (such as cloud hosting and payment processing), under contracts that require them to protect it, or where required by law.",
    ],
  },
  {
    heading: "Data security",
    paragraphs: [
      "We protect your data with encryption in transit, strict access controls, and tenant isolation. No system is perfectly secure, but we work continuously to safeguard your information and will notify you promptly of any breach affecting your data.",
    ],
  },
  {
    heading: "Data retention",
    paragraphs: [
      "We keep your data for as long as your account is active. If you close your account, we delete or anonymise your data within a reasonable period, except where we must retain records to meet legal obligations.",
    ],
  },
  {
    heading: "Your rights",
    bullets: [
      "Access and export the data you have stored in TrustOps.",
      "Correct inaccurate information.",
      "Request deletion of your account and associated data.",
      "Object to or restrict certain processing.",
    ],
  },
  {
    heading: "Contact us",
    paragraphs: [
      "Questions about this policy or your data? Email privacy@trustops.ai or use our contact form and we'll respond promptly.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Privacy"
        highlight="Policy"
        subtitle="Your trust is the product. Here's exactly what we collect, why, and the control you have over it."
      />
      <LegalDoc
        updated={UPDATED}
        intro="This Privacy Policy explains how TrustOps AI (“TrustOps”, “we”, “us”) handles information when you use our platform. By using TrustOps you agree to the practices described here."
        sections={SECTIONS}
      />
    </>
  );
}
