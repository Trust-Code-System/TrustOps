import type { Metadata } from "next";
import Link from "next/link";
import {
  ReceiptText,
  Users,
  Package,
  FileText,
  BarChart3,
  WalletCards,
  Orbit,
  Settings,
  LifeBuoy,
  Mail,
  MessageCircle,
  MapPin,
  Github,
  Linkedin,
  Twitter,
  ArrowRight,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { getSessionContext } from "@/modules/auth/session";
import { SupportForm } from "./support-form";

export const metadata: Metadata = {
  title: "Help Center · TrustOps",
  description: "Guides and answers for getting the most out of TrustOps.",
};

/**
 * Help Center (route "/help"). Static, server-rendered: a grid of topic cards
 * that link straight into the relevant feature, a FAQ built from native
 * <details> (no client JS), and a support contact card. All styling flows
 * through the design tokens — no hardcoded colors.
 */

interface Topic {
  icon: LucideIcon;
  title: string;
  body: string;
  href: string;
  cta: string;
}

const TOPICS: Topic[] = [
  {
    icon: ReceiptText,
    title: "Recording a sale",
    body: "Log a sale in seconds. Pick a customer, add products, take payment, and a receipt is ready to send.",
    href: "/sales/new",
    cta: "Record a sale",
  },
  {
    icon: Users,
    title: "Customers",
    body: "Build your customer list, see who owes you, and track each customer's spend over time.",
    href: "/customers",
    cta: "Go to customers",
  },
  {
    icon: Package,
    title: "Products & inventory",
    body: "Add products, set prices, and keep stock counts accurate so low-stock alerts stay reliable.",
    href: "/products",
    cta: "Manage products",
  },
  {
    icon: FileText,
    title: "Invoices",
    body: "Every sale becomes an invoice. Mark invoices paid, record part-payments, and chase what's overdue.",
    href: "/invoices",
    cta: "View invoices",
  },
  {
    icon: WalletCards,
    title: "Expenses",
    body: "Record money out by category so your cashflow and profit reports reflect the full picture.",
    href: "/expenses",
    cta: "Track expenses",
  },
  {
    icon: BarChart3,
    title: "Analytics & reports",
    body: "See revenue, top products, and trends over any date range, then export a report as a PDF.",
    href: "/analytics",
    cta: "Open analytics",
  },
  {
    icon: Orbit,
    title: "AI assistant",
    body: "Ask plain-language questions about your business. Answers come from your own data, grounded in real figures.",
    href: "/assistant",
    cta: "Ask the assistant",
  },
  {
    icon: Settings,
    title: "Settings & staff",
    body: "Update your company details, switch branches, and invite staff with the right role and access.",
    href: "/settings",
    cta: "Open settings",
  },
];

interface Faq {
  q: string;
  a: string;
}

const FAQS: Faq[] = [
  {
    q: "How do I record my first sale?",
    a: "Open Sales from the sidebar (or the center button on mobile), choose or add a customer, add the products sold, then record the payment. An invoice and receipt are created automatically.",
  },
  {
    q: "What's the difference between Sales and Invoices?",
    a: "Sales is the action of recording a new transaction. Invoices is the list of everything you've recorded, where you can mark items paid, add part-payments, and follow up on overdue balances.",
  },
  {
    q: "How do I add staff or change someone's access?",
    a: "Go to Settings and open the staff section. Owners can invite a teammate by email and assign a role; the invite link lets them set a password and join your company.",
  },
  {
    q: "Is my data private to my business?",
    a: "Yes. Every account only ever sees its own company's data. Access is enforced at the database level, so one business can never read another's records, including through the AI assistant.",
  },
  {
    q: "How accurate is the AI assistant?",
    a: "The assistant answers only from your own data using real figures from the app — it never invents numbers. It's read-only: it can summarise and advise, but it never records sales, payments, or stock changes. Always confirm important figures on the relevant screen.",
  },
  {
    q: "How do I export a report?",
    a: "Open Reports, pick a date range, then use the export action to save the summary as a PDF. The export contains the report only, without the app navigation around it.",
  },
  {
    q: "Why do amounts show in Naira (₦)?",
    a: "TrustOps is built for African SMEs and currently records all amounts in Nigerian Naira, formatted with thousands separators so figures stay easy to scan.",
  },
];

// Support is operated by TrustCode System Limited (trustcodesystem.tech).
const SUPPORT_EMAIL = "hello@trustcodesystem.tech";
const SUPPORT_WHATSAPP_DISPLAY = "+234 913 406 2773";
const SUPPORT_WHATSAPP_LINK = "https://wa.me/2349134062773";
const SUPPORT_LOCATIONS = "Lagos, Nigeria · London, UK · Remote worldwide";

export default async function HelpCenterPage() {
  const ctx = await getSessionContext();
  const defaultEmail = ctx?.email ?? undefined;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-display">Help Center</h1>
          <p className="mt-1 max-w-2xl text-body text-text-secondary">
            Short guides and answers to help you run your business with TrustOps.
            Pick a topic to jump straight in.
          </p>
        </div>
        <a href="#contact" className={buttonVariants({ variant: "secondary" })}>
          <Mail className="h-[18px] w-[18px]" aria-hidden="true" />
          Contact support
        </a>
      </div>

      {/* Topic cards */}
      <section aria-labelledby="topics-heading">
        <h2 id="topics-heading" className="sr-only">
          Browse topics
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((t) => {
            const Icon = t.icon;
            return (
              <Card key={t.title} className="flex flex-col transition-shadow hover:shadow-sm">
                <CardContent className="flex flex-1 flex-col gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-50 text-primary-600">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="text-h3 text-text-primary">{t.title}</h3>
                  <p className="flex-1 text-small text-text-secondary">{t.body}</p>
                  <Link
                    href={t.href}
                    className="group inline-flex items-center gap-1 text-small font-[600] text-primary-700 hover:text-primary-600"
                  >
                    {t.cta}
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-heading" className="space-y-4">
        <h2 id="faq-heading" className="text-h1">
          Frequently asked questions
        </h2>
        <Card>
          <div className="divide-y divide-border-subtle">
            {FAQS.map((f) => (
              <details key={f.q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 text-body-strong text-text-primary transition-colors hover:bg-gray-50 sm:px-6">
                  {f.q}
                  <ChevronDown
                    className="h-5 w-5 shrink-0 text-text-muted transition-transform duration-fast group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <div className="px-4 pb-4 text-body text-text-secondary sm:px-6">
                  {f.a}
                </div>
              </details>
            ))}
          </div>
        </Card>
      </section>

      {/* Contact */}
      <section id="contact" aria-labelledby="contact-heading" className="space-y-4 scroll-mt-24">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-600 text-text-on-primary">
            <LifeBuoy className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="contact-heading" className="text-h1">
              Still need a hand?
            </h2>
            <p className="mt-0.5 text-small text-text-secondary">
              Send us a message and we&apos;ll get back to you, usually within one
              business day.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
          {/* Message form → lands in the platform support inbox */}
          <Card>
            <CardContent>
              <SupportForm defaultEmail={defaultEmail} />
            </CardContent>
          </Card>

          {/* Direct channels (TrustCode System Limited) */}
          <Card className="bg-primary-50">
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-h3 text-text-primary">Other ways to reach us</h3>
                <p className="mt-0.5 text-small text-text-secondary">
                  Support by TrustCode System Limited.
                </p>
              </div>
              <ul className="space-y-3 text-small">
                <li className="flex items-center gap-3">
                  <Mail className="h-[18px] w-[18px] shrink-0 text-primary-600" aria-hidden="true" />
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="font-[500] text-primary-700 hover:text-primary-600"
                  >
                    {SUPPORT_EMAIL}
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <MessageCircle className="h-[18px] w-[18px] shrink-0 text-primary-600" aria-hidden="true" />
                  <a
                    href={SUPPORT_WHATSAPP_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-[500] text-primary-700 hover:text-primary-600"
                  >
                    WhatsApp {SUPPORT_WHATSAPP_DISPLAY}
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-[18px] w-[18px] shrink-0 text-primary-600" aria-hidden="true" />
                  <span className="text-text-secondary">{SUPPORT_LOCATIONS}</span>
                </li>
              </ul>
              <div className="flex items-center gap-2 border-t border-primary-100 pt-3">
                <a
                  href="https://github.com/Trust-Code-System"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TrustCode System on GitHub"
                  className="flex h-9 w-9 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-card hover:text-primary-700"
                >
                  <Github className="h-5 w-5" aria-hidden="true" />
                </a>
                <a
                  href="https://www.linkedin.com/company/trustcode-system-limited/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TrustCode System on LinkedIn"
                  className="flex h-9 w-9 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-card hover:text-primary-700"
                >
                  <Linkedin className="h-5 w-5" aria-hidden="true" />
                </a>
                <a
                  href="https://x.com/trustcodesys"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TrustCode System on X"
                  className="flex h-9 w-9 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-card hover:text-primary-700"
                >
                  <Twitter className="h-5 w-5" aria-hidden="true" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
