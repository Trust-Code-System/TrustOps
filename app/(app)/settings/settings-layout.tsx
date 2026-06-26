"use client";

import { useState, type ReactNode } from "react";
import { Building2, Store, Users, Bell, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SettingsTab = {
  id: string;
  label: string;
  content: ReactNode;
};

const ICONS: Record<string, LucideIcon> = {
  company: Building2,
  branches: Store,
  staff: Users,
  notifications: Bell,
  ai: Sparkles,
};

/**
 * Settings shell — a left tab rail (Stitch design) that swaps the right panel.
 * Each section is server-rendered and passed in as `content`; this only owns
 * which one is visible. On mobile the rail becomes a horizontal scroller.
 */
export function SettingsLayout({ tabs }: { tabs: SettingsTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <aside className="shrink-0 lg:w-64">
        <div className="flex gap-1 overflow-x-auto rounded-lg border border-border-subtle bg-surface-card p-2 lg:flex-col">
          {tabs.map((t) => {
            const Icon = ICONS[t.id] ?? Building2;
            const isActive = t.id === current?.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(t.id)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 whitespace-nowrap rounded-md px-4 py-3 text-left text-[15px] font-[600] transition-colors",
                  isActive
                    ? "bg-primary-50 text-primary-700"
                    : "text-text-secondary hover:bg-gray-100",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                {t.label}
              </button>
            );
          })}
        </div>
      </aside>

      <div className="min-w-0 flex-1">{current?.content}</div>
    </div>
  );
}
