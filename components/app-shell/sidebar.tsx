"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SIDEBAR_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils";

/**
 * Left sidebar — design system §2.1. 240px on desktop, collapses to a 64px icon
 * rail on tablet. Hidden on mobile (bottom tab bar takes over).
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 top-14 z-30 hidden w-16 border-r border-border-subtle bg-surface-card lg:w-60 md:block">
      <nav className="flex flex-col gap-1 p-3" aria-label="Primary">
        {SIDEBAR_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-[15px] font-[600] transition-colors duration-fast lg:justify-start justify-center",
                active
                  ? "bg-primary-50 text-primary-700"
                  : "text-text-secondary hover:bg-gray-100",
              )}
            >
              <Icon className="h-6 w-6 shrink-0" strokeWidth={1.5} aria-hidden="true" />
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
