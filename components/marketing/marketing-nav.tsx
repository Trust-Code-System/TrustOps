"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "./brand";

/**
 * Public site header — sticky, frosted, indigo glow. Shared by the landing page
 * and every marketing sub-page, with real route links (no more #features
 * anchors) and an active-state highlight for the current section.
 */
export function MarketingNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0712]/70 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-content items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" aria-label="TrustOps AI home">
          <Logo label="TrustOps AI" size={30} wordmarkClassName="text-white text-[19px] leading-none" />
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "text-small font-[600] transition-colors hover:text-white",
                isActive(item.href) ? "text-white" : "text-white/60",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="hidden rounded-full px-4 py-2 text-small font-[600] text-white/70 transition-colors hover:text-white sm:inline-flex"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-small font-[700] text-[#0a0712] shadow-[0_0_24px_-4px_rgba(168,85,247,0.6)] transition-transform hover:-translate-y-0.5"
          >
            Get Started
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
