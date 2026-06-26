"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, LifeBuoy, LogOut } from "lucide-react";
import { SIDEBAR_ITEMS } from "./nav-items";
import { signOut } from "@/modules/auth/actions";
import { cn } from "@/lib/utils";

/**
 * Left sidebar — matches the TrustOps AI Stitch design. 240px on desktop,
 * collapses to a 64px icon rail on tablet, hidden on mobile (bottom tab bar
 * takes over). A branded logo block up top, the primary nav with an
 * "Intelligence" divider before the Assistant, and a Record Sale CTA + Help /
 * Sign out pinned to the bottom.
 */

// Destinations under the "Intelligence" section divider.
const INTELLIGENCE_HREFS = new Set(["/assistant"]);

export function Sidebar() {
  const pathname = usePathname();

  const main = SIDEBAR_ITEMS.filter((i) => !INTELLIGENCE_HREFS.has(i.href));
  const intelligence = SIDEBAR_ITEMS.filter((i) =>
    INTELLIGENCE_HREFS.has(i.href),
  );

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const link = (href: string, label: string, Icon: (typeof SIDEBAR_ITEMS)[number]["icon"]) => (
    <Link
      key={href}
      href={href}
      aria-current={isActive(href) ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] font-[600] transition-colors duration-fast lg:justify-start justify-center",
        isActive(href)
          ? "bg-primary-600 text-text-on-primary"
          : "text-text-secondary hover:bg-gray-100",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <span className="hidden lg:inline">{label}</span>
    </Link>
  );

  return (
    <aside className="fixed inset-y-0 left-0 top-14 z-30 hidden w-16 flex-col border-r border-border-subtle bg-surface-card p-3 lg:w-60 md:flex">
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto" aria-label="Primary">
        {main.map((item) => link(item.href, item.label, item.icon))}

        {intelligence.length > 0 && (
          <>
            <p className="mt-4 mb-1 hidden px-3 text-caption font-[600] uppercase tracking-[0.08em] text-text-muted lg:block">
              Intelligence
            </p>
            {intelligence.map((item) => link(item.href, item.label, item.icon))}
          </>
        )}
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-border-subtle pt-3">
        <Link
          href="/sales/new"
          className="mb-2 flex items-center justify-center gap-2 rounded-md bg-primary-600 px-3 py-2.5 text-[15px] font-[600] text-text-on-primary transition-colors hover:bg-primary-700"
        >
          <Plus className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="hidden lg:inline">Record Sale</span>
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-small text-text-secondary transition-colors hover:bg-gray-100 lg:justify-start justify-center"
        >
          <LifeBuoy className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          <span className="hidden lg:inline">Help Center</span>
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-small text-text-secondary transition-colors hover:bg-gray-100 lg:justify-start justify-center"
          >
            <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span className="hidden lg:inline">Sign out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
