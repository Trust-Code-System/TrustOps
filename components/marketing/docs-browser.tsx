"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  Rocket,
  ScanLine,
  Package,
  Sparkles,
  BarChart3,
  CreditCard,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GLASS_CARD } from "./brand";

/**
 * Documentation index with live client-side filtering. Static article catalogue
 * for now (deep links land on the relevant signup/app flow); swap for a real
 * docs backend later without changing the surface.
 */
interface DocCategory {
  icon: LucideIcon;
  title: string;
  blurb: string;
  articles: string[];
}

const CATEGORIES: DocCategory[] = [
  {
    icon: Rocket,
    title: "Getting started",
    blurb: "Create your company, add a branch, invite your team.",
    articles: [
      "Create your TrustOps account",
      "Set up your first branch",
      "Invite teammates and assign roles",
      "Import your existing products",
    ],
  },
  {
    icon: ScanLine,
    title: "Sales & invoicing",
    blurb: "Record sales and send professional invoices.",
    articles: [
      "Record a sale in seconds",
      "Create and send an invoice",
      "Track partial and overdue payments",
      "Accept cash, transfer, and card",
    ],
  },
  {
    icon: Package,
    title: "Inventory",
    blurb: "Keep stock accurate across every location.",
    articles: [
      "Add and edit products",
      "Set reorder points and low-stock alerts",
      "Manage stock across branches",
      "Track cost vs. selling price",
    ],
  },
  {
    icon: Sparkles,
    title: "AI Assistant",
    blurb: "Ask questions about your business in plain language.",
    articles: [
      "Ask the AI Assistant a question",
      "Understand restock recommendations",
      "How your data stays private",
      "Connect your Anthropic API key",
    ],
  },
  {
    icon: BarChart3,
    title: "Analytics & reports",
    blurb: "Read trends and export the numbers you need.",
    articles: [
      "Read your revenue dashboard",
      "Compare branches side by side",
      "Export reports to PDF",
      "Understand the payment mix",
    ],
  },
  {
    icon: CreditCard,
    title: "Account & billing",
    blurb: "Plans, payments, and managing your subscription.",
    articles: [
      "Choose the right plan",
      "Upgrade or downgrade anytime",
      "Update your billing details",
      "Manage team seats",
    ],
  },
];

export function DocsBrowser() {
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();

  const filtered = CATEGORIES.map((cat) => {
    if (!q) return cat;
    const matchesCat = cat.title.toLowerCase().includes(q) || cat.blurb.toLowerCase().includes(q);
    const articles = matchesCat
      ? cat.articles
      : cat.articles.filter((a) => a.toLowerCase().includes(q));
    return { ...cat, articles };
  }).filter((cat) => cat.articles.length > 0 || (!q ? true : false));

  return (
    <div>
      <div className="relative mx-auto mb-12 max-w-xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the docs…"
          aria-label="Search documentation"
          className="w-full rounded-full border border-white/10 bg-white/[0.04] py-3.5 pl-12 pr-4 text-small text-white placeholder:text-white/30 outline-none transition-colors focus:border-fuchsia-400/60 focus:bg-white/[0.06]"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-body text-white/50">
          No articles match &ldquo;{query}&rdquo;. Try a different term or{" "}
          <Link href="/support/contact" className="text-fuchsia-300 hover:underline">
            contact support
          </Link>
          .
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((cat) => (
            <div key={cat.title} className={cn(GLASS_CARD, "flex flex-col p-7")}>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-fuchsia-300">
                <cat.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-h3 text-white">{cat.title}</h3>
              <p className="mt-1 text-small text-white/45">{cat.blurb}</p>
              <ul className="mt-5 flex flex-col gap-2.5">
                {cat.articles.map((a) => (
                  <li key={a}>
                    <Link
                      href="/signup"
                      className="group flex items-center justify-between gap-2 text-small text-white/65 transition-colors hover:text-white"
                    >
                      {a}
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-white/25 transition-colors group-hover:text-fuchsia-300" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
