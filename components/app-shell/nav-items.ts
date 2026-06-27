import {
  Home,
  ReceiptText,
  Users,
  FileText,
  Package,
  Settings,
  BarChart3,
  WalletCards,
  FileDown,
  Orbit,
  LifeBuoy,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/**
 * Single source of truth for primary navigation — design system §2.1/§2.2.
 * Sidebar (desktop) shows all destinations. The mobile bottom tab bar shows the
 * top 3 + a center "Record sale" FAB + a "More" sheet for the overflow.
 */
export const SIDEBAR_ITEMS: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home },
  // "Sales" is the record-a-sale action (a sale becomes an invoice); the
  // Invoices item below is the list. They must point to different routes.
  { label: "Sales", href: "/sales/new", icon: ReceiptText },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Products", href: "/products", icon: Package },
  { label: "Invoices", href: "/invoices", icon: FileText },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Expenses", href: "/expenses", icon: WalletCards },
  { label: "Reports", href: "/reports", icon: FileDown },
  { label: "Assistant", href: "/assistant", icon: Orbit },
  { label: "Settings", href: "/settings", icon: Settings },
];

/**
 * Mobile tab bar: 2 left, FAB, 1 right + a More button (rendered separately).
 * Recording a sale is the center FAB (→/sales/new), so the bar surfaces the
 * Invoices list instead of a redundant "Sales" tab.
 */
export const TAB_ITEMS: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Invoices", href: "/invoices", icon: FileText },
  { label: "Customers", href: "/customers", icon: Users },
];

/** Overflow destinations shown in the mobile "More" sheet. */
export const MORE_ITEMS: NavItem[] = [
  { label: "Products", href: "/products", icon: Package },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Expenses", href: "/expenses", icon: WalletCards },
  { label: "Reports", href: "/reports", icon: FileDown },
  { label: "Assistant", href: "/assistant", icon: Orbit },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help Center", href: "/help", icon: LifeBuoy },
];

/** Mobile "More" entry shown only to the platform admin (see isPlatformAdmin). */
export const ADMIN_ITEM: NavItem = {
  label: "Admin",
  href: "/admin",
  icon: ShieldCheck,
};
