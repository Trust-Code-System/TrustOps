import * as React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Config-driven data table — design system §3.5.
 * Desktop: a real table (sticky caption header, 52px rows, hover, dividers).
 * Mobile (<sm): each row collapses to a stacked label/value card. Money columns
 * are right-aligned + tabular via `align: "right"`. Never horizontal-scrolls.
 */
export interface Column<T> {
  key: string;
  header: string;
  /** Cell renderer. */
  cell: (row: T) => React.ReactNode;
  align?: "left" | "right";
  /** Hide this column's label in the mobile card (e.g. the primary line). */
  hideLabelOnMobile?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  /** Shown when not loading and rows is empty. */
  emptyState?: React.ReactNode;
  skeletonRows?: number;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  isLoading,
  emptyState,
  skeletonRows = 5,
}: DataTableProps<T>) {
  if (isLoading) {
    return <DataTableSkeleton columns={columns.length} rows={skeletonRows} />;
  }

  if (rows.length === 0 && emptyState) {
    return <Card>{emptyState}</Card>;
  }

  return (
    <>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-hidden rounded-md border border-border-subtle sm:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="sticky top-0 bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    "border-b border-border-subtle px-4 py-3 text-caption font-[500] uppercase tracking-[0.04em] text-text-muted",
                    col.align === "right" ? "text-right" : "text-left",
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-border-subtle last:border-0",
                  onRowClick &&
                    "cursor-pointer transition-colors duration-fast hover:bg-gray-50",
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "h-[52px] px-4 text-[15px] text-text-primary",
                      col.align === "right" && "text-right tabular",
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked label/value cards */}
      <div className="space-y-3 sm:hidden">
        {rows.map((row) => (
          <Card
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn(
              "p-4",
              onRowClick && "cursor-pointer active:bg-gray-50",
            )}
          >
            <dl className="space-y-2">
              {columns.map((col) => (
                <div
                  key={col.key}
                  className="flex items-baseline justify-between gap-4"
                >
                  {!col.hideLabelOnMobile && (
                    <dt className="text-caption font-[500] uppercase tracking-[0.04em] text-text-muted">
                      {col.header}
                    </dt>
                  )}
                  <dd
                    className={cn(
                      "text-[15px] text-text-primary",
                      col.hideLabelOnMobile
                        ? "w-full text-body-strong"
                        : "text-right",
                      col.align === "right" && "tabular",
                    )}
                  >
                    {col.cell(row)}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
      </div>
    </>
  );
}

function DataTableSkeleton({
  columns,
  rows,
}: {
  columns: number;
  rows: number;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border-subtle">
      <div className="space-y-0">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="flex items-center gap-4 border-b border-border-subtle px-4 last:border-0"
            style={{ height: 52 }}
          >
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
