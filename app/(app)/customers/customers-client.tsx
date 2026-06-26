"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Users,
  UserPlus,
  Download,
  ListFilter,
  ArrowUpDown,
  TrendingUp,
  Activity,
  Wallet,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CustomerFormModal } from "./customer-form-modal";
import { cn } from "@/lib/utils";
import { formatNaira } from "@/lib/money";
import type { Customer } from "@/modules/shared/types";
import type {
  CustomerMetrics,
  CustomerStatus,
  CustomerWithStats,
} from "@/modules/customers/queries";

const PAGE_SIZE = 8;

type StatusFilter = "all" | CustomerStatus;
type SortKey = "name" | "spend" | "recent";

const STATUS_TONE: Record<CustomerStatus, "success" | "neutral" | "danger"> = {
  active: "success",
  inactive: "neutral",
  overdue: "danger",
};

const AVATAR_TONES = [
  "bg-primary-50 text-primary-700",
  "bg-success-50 text-success-700",
  "bg-warning-50 text-warning-700",
  "bg-info-50 text-info-500",
];

export function CustomersClient({
  customers,
  metrics,
  query,
}: {
  customers: CustomerWithStats[];
  metrics: CustomerMetrics;
  query: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [term, setTerm] = useState(query);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("name");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [open, setOpen] = useState(false);

  function runSearch(value: string) {
    setTerm(value);
    setPage(1);
    startTransition(() => {
      const params = new URLSearchParams();
      if (value.trim()) params.set("q", value.trim());
      router.replace(`/customers${params.size ? `?${params}` : ""}`);
    });
  }

  function openAdd() {
    setEditing(null);
    setOpen(true);
  }

  // Client-side filter + sort over the (server-searched) rows.
  const processed = useMemo(() => {
    const filtered =
      statusFilter === "all"
        ? customers
        : customers.filter((c) => c.status === statusFilter);
    const sorted = [...filtered].sort((a, b) => {
      if (sort === "spend") return b.totalSpend - a.totalSpend;
      if (sort === "recent") {
        return (
          new Date(b.lastActivityAt ?? 0).getTime() -
          new Date(a.lastActivityAt ?? 0).getTime()
        );
      }
      return a.full_name.localeCompare(b.full_name);
    });
    return sorted;
  }, [customers, statusFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = processed.slice(start, start + PAGE_SIZE);

  function exportCsv() {
    const header = ["Name", "Email", "Phone", "Status", "Total spend", "Invoices"];
    const lines = processed.map((c) =>
      [
        c.full_name,
        c.email ?? "",
        c.phone,
        c.status,
        formatNaira(c.totalSpend, { withSymbol: false }),
        c.invoiceCount,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customers.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const isEmptySearch = customers.length === 0 && query.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-display">Customers</h1>
          <p className="mt-1 text-body text-text-secondary">
            Manage and track your client relationships.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={exportCsv}>
            <Download /> Export
          </Button>
          <Button onClick={openAdd}>
            <UserPlus /> Add customer
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <MetricTile
          label="Total Customers"
          icon={Users}
          value={metrics.totalCustomers.toLocaleString()}
          note="+12% from last month"
          noteTone="success"
          noteIcon={TrendingUp}
        />
        <MetricTile
          label="Active This Week"
          icon={Activity}
          value={metrics.activeThisWeek.toLocaleString()}
          note="Engaged in the last 7 days"
          noteTone="muted"
        />
        <MetricTile
          label="Avg. LTV"
          icon={Wallet}
          value={<Money kobo={metrics.avgLtv} />}
          note="Average spend per customer"
          noteTone="muted"
        />
      </div>

      {/* Table container */}
      <Card className="overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col items-stretch gap-3 border-b border-border-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            />
            <Input
              value={term}
              onChange={(e) => runSearch(e.target.value)}
              placeholder="Search by name or email…"
              aria-label="Search customers"
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Menu
              icon={ListFilter}
              label={
                statusFilter === "all"
                  ? "Filter"
                  : `Filter: ${cap(statusFilter)}`
              }
              options={[
                { value: "all", label: "All statuses" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "overdue", label: "Overdue" },
              ]}
              value={statusFilter}
              onSelect={(v) => {
                setStatusFilter(v as StatusFilter);
                setPage(1);
              }}
            />
            <Menu
              icon={ArrowUpDown}
              label="Sort"
              options={[
                { value: "name", label: "Name (A–Z)" },
                { value: "spend", label: "Total spend" },
                { value: "recent", label: "Recent activity" },
              ]}
              value={sort}
              onSelect={(v) => setSort(v as SortKey)}
            />
          </div>
        </div>

        {/* Body */}
        {isEmptySearch ? (
          <EmptyState
            icon={Search}
            title="No matches"
            description={`No customers match "${query}". Try a different name or email.`}
          />
        ) : processed.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers yet"
            description="Add your first customer to start recording sales."
            action={<Button onClick={openAdd}>Add customer</Button>}
          />
        ) : (
          <div aria-busy={pending ? "true" : undefined}>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[800px] border-collapse text-left">
                <thead>
                  <tr className="bg-gray-50">
                    <Th>Customer</Th>
                    <Th>Status</Th>
                    <Th align="right">Total Spend</Th>
                    <Th align="right">Invoices</Th>
                    <Th>Last Activity</Th>
                    <Th align="center">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/customers/${c.id}`)}
                      className="group cursor-pointer border-b border-border-subtle transition-colors last:border-0 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.full_name} index={c.id.charCodeAt(0)} />
                          <div>
                            <div className="text-[15px] font-[600] text-text-primary">
                              {c.full_name}
                            </div>
                            <div className="text-small text-text-muted">
                              {c.email ?? c.phone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={STATUS_TONE[c.status]}>{cap(c.status)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Money kobo={c.totalSpend} className="text-[15px]" />
                      </td>
                      <td className="px-4 py-3 text-right tabular text-text-secondary">
                        {c.invoiceCount}
                      </td>
                      <td className="px-4 py-3 text-small text-text-muted">
                        {relativeTime(c.lastActivityAt)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          aria-label={`Edit ${c.full_name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditing(c);
                            setOpen(true);
                          }}
                          className="rounded-md p-1.5 text-text-muted opacity-0 transition-opacity hover:bg-gray-100 hover:text-primary-600 focus:opacity-100 group-hover:opacity-100"
                        >
                          <MoreVertical className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-border-subtle sm:hidden">
              {pageRows.map((c) => (
                <li
                  key={c.id}
                  onClick={() => router.push(`/customers/${c.id}`)}
                  className="flex cursor-pointer items-center gap-3 p-4 active:bg-gray-50"
                >
                  <Avatar name={c.full_name} index={c.id.charCodeAt(0)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[15px] font-[600] text-text-primary">
                        {c.full_name}
                      </span>
                      <Badge tone={STATUS_TONE[c.status]}>{cap(c.status)}</Badge>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate text-small text-text-muted">
                        {c.invoiceCount} invoices · {relativeTime(c.lastActivityAt)}
                      </span>
                      <Money kobo={c.totalSpend} className="text-small" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Pagination */}
            <div className="flex items-center justify-between gap-4 border-t border-border-subtle p-4 text-small text-text-muted">
              <span>
                Showing {start + 1} to {start + pageRows.length} of{" "}
                {processed.length} {processed.length === 1 ? "entry" : "entries"}
              </span>
              <div className="flex items-center gap-1">
                <PagerButton
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  label="Previous page"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </PagerButton>
                {pageList(currentPage, totalPages).map((p, i) =>
                  p === "…" ? (
                    <span key={`gap-${i}`} className="px-1">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      aria-current={p === currentPage ? "page" : undefined}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-md text-small font-[600] transition-colors",
                        p === currentPage
                          ? "bg-primary-600 text-text-on-primary"
                          : "text-text-secondary hover:bg-gray-100",
                      )}
                    >
                      {p}
                    </button>
                  ),
                )}
                <PagerButton
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  label="Next page"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </PagerButton>
              </div>
            </div>
          </div>
        )}
      </Card>

      <CustomerFormModal
        key={editing?.id ?? "new"}
        open={open}
        onClose={() => setOpen(false)}
        customer={editing}
      />
    </div>
  );
}

/* ---------- helpers & sub-components ---------- */

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-border-subtle px-4 py-3 text-caption font-[600] uppercase tracking-[0.04em] text-text-muted",
        align === "right" && "text-right",
        align === "center" && "text-center",
      )}
    >
      {children}
    </th>
  );
}

function MetricTile({
  label,
  icon: Icon,
  value,
  note,
  noteTone,
  noteIcon: NoteIcon,
}: {
  label: string;
  icon: LucideIcon;
  value: React.ReactNode;
  note: string;
  noteTone: "success" | "muted";
  noteIcon?: LucideIcon;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <span className="text-caption font-[600] uppercase tracking-[0.04em] text-text-muted">
          {label}
        </span>
        <Icon className="h-5 w-5 text-primary-600" aria-hidden="true" />
      </div>
      <div className="mt-2 text-metric tabular text-text-primary">{value}</div>
      <div
        className={cn(
          "mt-2 flex items-center gap-1 text-small",
          noteTone === "success" ? "text-success-700" : "text-text-muted",
        )}
      >
        {NoteIcon && <NoteIcon className="h-4 w-4" aria-hidden="true" />}
        {note}
      </div>
    </Card>
  );
}

function Avatar({ name, index }: { name: string; index: number }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  const tone = AVATAR_TONES[index % AVATAR_TONES.length];
  return (
    <span
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-small font-[600]",
        tone,
      )}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

function PagerButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded-md p-1 text-text-secondary transition-colors hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** Lightweight dropdown menu styled as a toolbar button. */
function Menu({
  icon: Icon,
  label,
  options,
  value,
  onSelect,
}: {
  icon: LucideIcon;
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-small text-text-secondary transition-colors hover:bg-gray-100"
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        {label}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[180px] overflow-hidden rounded-md border border-border-subtle bg-surface-card py-1 shadow-md"
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="menuitemradio"
              aria-checked={opt.value === value}
              onMouseDown={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between px-3 py-2 text-left text-small hover:bg-gray-100",
                opt.value === value
                  ? "font-[600] text-primary-700"
                  : "text-text-secondary",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Compact page list with ellipsis, e.g. [1, 2, 3, "…", 12]. */
function pageList(current: number, total: number): (number | "…")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const lo = Math.max(2, current - 1);
  const hi = Math.min(total - 1, current + 1);
  if (lo > 2) pages.push("…");
  for (let p = lo; p <= hi; p++) pages.push(p);
  if (hi < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

/** Coarse relative time for the Last Activity column. */
function relativeTime(iso: string | null): string {
  if (!iso) return "No activity";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}
