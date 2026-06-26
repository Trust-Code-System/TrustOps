"use client";

import * as React from "react";
import { TopBar } from "./topbar";
import { Sidebar } from "./sidebar";
import { BottomTabBar } from "./bottom-tab-bar";
import type { Branch, Notification } from "@/modules/shared/types";

const BRANCH_STORAGE_KEY = "trustops.currentBranchId";

interface AppShellProps {
  companyName: string;
  userName: string;
  userRole: string;
  branches: Branch[];
  notifications: Notification[];
  unreadCount: number;
  isPlatformAdmin?: boolean;
  children: React.ReactNode;
}

/**
 * App shell — design system §2.1/§2.2. Composes the top bar, sidebar (desktop),
 * and bottom tab bar + FAB (mobile) around the page content. The selected branch
 * is the active scope for the session; persisted client-side as a seam until
 * branch-scoped queries land in a later phase.
 */
export function AppShell({
  companyName,
  userName,
  userRole,
  branches,
  notifications,
  unreadCount,
  isPlatformAdmin,
  children,
}: AppShellProps) {
  const primaryBranch = branches.find((b) => b.is_primary) ?? branches[0];
  const [currentBranchId, setCurrentBranchId] = React.useState<string | null>(
    primaryBranch?.id ?? null,
  );

  React.useEffect(() => {
    const stored = localStorage.getItem(BRANCH_STORAGE_KEY);
    if (stored && branches.some((b) => b.id === stored)) {
      setCurrentBranchId(stored);
    }
  }, [branches]);

  const handleBranchChange = React.useCallback((branchId: string) => {
    setCurrentBranchId(branchId);
    localStorage.setItem(BRANCH_STORAGE_KEY, branchId);
  }, []);

  return (
    <div className="min-h-screen bg-surface-page">
      <TopBar
        companyName={companyName}
        userName={userName}
        userRole={userRole}
        branches={branches}
        currentBranchId={currentBranchId}
        onBranchChange={handleBranchChange}
        notifications={notifications}
        unreadCount={unreadCount}
        isPlatformAdmin={isPlatformAdmin}
      />
      <Sidebar />
      <main className="px-4 pb-24 pt-[calc(3.5rem+1rem)] md:pl-[calc(4rem+1rem)] md:pb-8 lg:pl-[calc(15rem+2rem)] lg:pr-8">
        <div className="mx-auto max-w-content">{children}</div>
      </main>
      <BottomTabBar isPlatformAdmin={isPlatformAdmin} />
    </div>
  );
}
