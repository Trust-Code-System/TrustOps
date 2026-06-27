"use client";

import * as React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND_GRADIENT, GLASS_CARD } from "./brand";

/**
 * Pricing tiers with a monthly/annual billing toggle. Prices are in Naira (the
 * product is built for African SMEs); annual billing bills ~2 months free.
 */
interface Plan {
  name: string;
  tagline: string;
  monthly: number | null; // null = custom / free handled via priceLabel
  priceLabel?: string;
  cta: { label: string; href: string };
  featured?: boolean;
  features: string[];
}

const PLANS: Plan[] = [
  {
    name: "Starter",
    tagline: "For a single shop finding its feet.",
    monthly: 0,
    priceLabel: "Free",
    cta: { label: "Start for free", href: "/signup" },
    features: [
      "1 branch",
      "Up to 100 products",
      "Sales & invoicing",
      "1 team member",
      "Email support",
    ],
  },
  {
    name: "Growth",
    tagline: "For growing businesses that want insight.",
    monthly: 15000,
    cta: { label: "Start free trial", href: "/signup" },
    featured: true,
    features: [
      "Up to 3 branches",
      "Unlimited products",
      "AI Assistant (Claude)",
      "Full analytics & reports",
      "5 team members",
      "Priority email support",
    ],
  },
  {
    name: "Scale",
    tagline: "For multi-branch operations at scale.",
    monthly: 45000,
    cta: { label: "Start free trial", href: "/signup" },
    features: [
      "Unlimited branches",
      "Advanced analytics",
      "Unlimited team members",
      "API access",
      "Role-based permissions",
      "Priority chat support",
    ],
  },
  {
    name: "Enterprise",
    tagline: "For networks that need bespoke terms.",
    monthly: null,
    priceLabel: "Custom",
    cta: { label: "Talk to us", href: "/support/contact" },
    features: [
      "Everything in Scale",
      "Dedicated success manager",
      "Custom integrations",
      "SLA & onboarding",
      "Volume discounts",
    ],
  },
];

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

export function PricingPlans() {
  const [annual, setAnnual] = React.useState(true);

  return (
    <div>
      {/* Billing toggle */}
      <div className="mb-12 flex items-center justify-center gap-4">
        <span className={cn("text-small font-[600]", !annual ? "text-white" : "text-white/40")}>
          Monthly
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={annual}
          aria-label="Toggle annual billing"
          onClick={() => setAnnual((a) => !a)}
          className={cn(
            "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 ring-1 ring-inset ring-white/10 transition-colors",
            annual ? BRAND_GRADIENT : "bg-white/10",
          )}
        >
          <span
            className={cn(
              "h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-out",
              annual ? "translate-x-5" : "translate-x-0",
            )}
          />
        </button>
        <span className={cn("text-small font-[600]", annual ? "text-white" : "text-white/40")}>
          Annual
          <span className="ml-2 rounded-full bg-emerald-400/15 px-2 py-0.5 text-caption font-[700] text-emerald-300">
            2 months free
          </span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const priceNode = (() => {
            if (plan.priceLabel) {
              return <span className="font-display text-[34px] font-[600] text-white">{plan.priceLabel}</span>;
            }
            const perMonth = annual ? Math.round((plan.monthly as number) * 10 / 12) : (plan.monthly as number);
            return (
              <>
                <span className="font-display text-[34px] font-[600] tabular text-white">{naira(perMonth)}</span>
                <span className="text-small text-white/45">/mo</span>
              </>
            );
          })();

          return (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col p-7",
                plan.featured
                  ? "rounded-3xl border border-fuchsia-400/40 bg-white/[0.05] shadow-[0_24px_60px_-24px_rgba(168,85,247,0.6)]"
                  : cn(GLASS_CARD),
              )}
            >
              {plan.featured && (
                <span className={cn("absolute -top-3 left-7 rounded-full px-3 py-1 text-caption font-[700] text-white", BRAND_GRADIENT)}>
                  Most popular
                </span>
              )}
              <h3 className="text-h3 text-white">{plan.name}</h3>
              <p className="mt-1 min-h-[40px] text-small text-white/50">{plan.tagline}</p>
              <div className="mt-5 flex items-end gap-1">{priceNode}</div>
              {plan.monthly !== null && plan.monthly > 0 && annual && (
                <p className="mt-1 text-caption text-white/40">billed annually</p>
              )}
              {(plan.monthly === 0 || plan.priceLabel === "Custom") && (
                <p className="mt-1 text-caption text-white/40">&nbsp;</p>
              )}

              <Link
                href={plan.cta.href}
                className={cn(
                  "mt-6 inline-flex items-center justify-center rounded-full px-5 py-3 text-small font-[700] transition-transform hover:-translate-y-0.5",
                  plan.featured
                    ? "bg-white text-[#0a0712] shadow-[0_0_30px_-6px_rgba(168,85,247,0.8)]"
                    : "border border-white/20 bg-white/5 text-white hover:bg-white/10",
                )}
              >
                {plan.cta.label}
              </Link>

              <ul className="mt-7 flex flex-col gap-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-small text-white/70">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-300" strokeWidth={2.5} aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
