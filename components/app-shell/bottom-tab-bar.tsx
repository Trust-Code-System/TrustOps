"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal, Plus } from "lucide-react";
import { TAB_ITEMS, MORE_ITEMS, type NavItem } from "./nav-items";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

/**
 * Mobile bottom tab bar + center "Record sale" FAB — design system §2.2.
 * The FAB overlaps the bar and is always one tap away. Overflow destinations
 * live in a "More" sheet (§2.1). Hidden at >=768px where the sidebar takes over.
 */
export function BottomTabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const left = TAB_ITEMS.slice(0, 2); // Home, Sales
  const right = TAB_ITEMS.slice(2, 3); // Customers
  const moreActive = MORE_ITEMS.some(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-border-subtle bg-surface-card pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Primary"
      >
        <div className="flex flex-1">
          {left.map((item) => (
            <Tab key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
        <div className="w-20" aria-hidden="true" />
        <div className="flex flex-1">
          {right.map((item) => (
            <Tab key={item.href} item={item} pathname={pathname} />
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-current={moreActive ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-caption",
              moreActive ? "text-primary-700" : "text-text-muted",
            )}
          >
            <MoreHorizontal className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
            More
          </button>
        </div>
      </nav>

      {/* Center FAB — Record sale */}
      <Link
        href="/sales/new"
        aria-label="Record sale"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+18px)] left-1/2 z-50 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-primary-600 text-text-on-primary shadow-lg transition-colors duration-fast hover:bg-primary-700 md:hidden"
      >
        <Plus className="h-7 w-7" />
      </Link>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <nav className="flex flex-col" aria-label="More destinations">
          {MORE_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-3 text-body",
                  active ? "bg-primary-50 text-primary-700" : "text-text-secondary hover:bg-gray-100",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </Modal>
    </>
  );
}

function Tab({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 text-caption",
        active ? "text-primary-700" : "text-text-muted",
      )}
    >
      <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
      {item.label}
    </Link>
  );
}
