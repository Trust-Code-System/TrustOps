"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, GitBranch, LogOut, ShieldCheck } from "lucide-react";
import { Branch, Notification } from "@/modules/shared/types";
import { signOut } from "@/modules/auth/actions";
import { NotificationsBell } from "./notifications-bell";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

interface TopBarProps {
  companyName: string;
  userName: string;
  userRole: string;
  branches: Branch[];
  currentBranchId: string | null;
  onBranchChange: (branchId: string) => void;
  notifications: Notification[];
  unreadCount: number;
  isPlatformAdmin?: boolean;
}

/**
 * Top bar — design system §2.1. 56px, white, border-bottom.
 * Branch switcher, notifications placeholder, profile menu (sign out).
 */
export function TopBar({
  companyName,
  userName,
  userRole,
  branches,
  currentBranchId,
  onBranchChange,
  notifications,
  unreadCount,
  isPlatformAdmin,
}: TopBarProps) {
  const currentBranch =
    branches.find((b) => b.id === currentBranchId) ?? branches[0];

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border-subtle bg-surface-card px-4">
      <div className="flex items-center gap-3">
        <Logo size={26} />
        <span className="hidden text-small text-text-muted sm:inline">
          {companyName}
        </span>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {branches.length > 0 && (
          <Dropdown
            trigger={
              <>
                <GitBranch className="h-[18px] w-[18px] text-text-muted" aria-hidden="true" />
                <span className="max-w-[120px] truncate">
                  {currentBranch?.name ?? "Branch"}
                </span>
                <ChevronDown className="h-4 w-4 text-text-muted" aria-hidden="true" />
              </>
            }
            label="Switch branch"
          >
            {branches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => onBranchChange(b.id)}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-left text-small hover:bg-gray-100",
                  b.id === currentBranch?.id && "text-primary-700",
                )}
              >
                {b.name}
                {b.is_primary && (
                  <span className="text-caption text-text-muted">Primary</span>
                )}
              </button>
            ))}
          </Dropdown>
        )}

        <NotificationsBell notifications={notifications} unreadCount={unreadCount} />

        <Dropdown
          align="right"
          label="Profile menu"
          trigger={
            <>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-50 text-caption font-[600] text-primary-700">
                {userName.charAt(0).toUpperCase()}
              </span>
              <ChevronDown className="h-4 w-4 text-text-muted" aria-hidden="true" />
            </>
          }
        >
          <div className="border-b border-border-subtle px-3 py-2">
            <p className="text-small font-[600] text-text-primary">{userName}</p>
            <p className="text-caption capitalize text-text-muted">{userRole}</p>
          </div>
          {isPlatformAdmin && (
            <Link
              href="/admin"
              className="flex w-full items-center gap-2 border-b border-border-subtle px-3 py-2 text-left text-small text-text-secondary hover:bg-gray-100"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Admin
            </Link>
          )}
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-small text-text-secondary hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </Dropdown>
      </div>
    </header>
  );
}

/** Lightweight dropdown: toggles on click, closes on outside click / Escape. */
function Dropdown({
  trigger,
  children,
  label,
  align = "left",
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  label: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-small text-text-secondary hover:bg-gray-100"
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-full z-50 mt-1 min-w-[180px] overflow-hidden rounded-md border border-border-subtle bg-surface-card py-1 shadow-md",
            align === "right" ? "right-0" : "left-0",
          )}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}
