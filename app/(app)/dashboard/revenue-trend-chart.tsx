import { koboToNaira } from "@/lib/money";
import type { RevenueTrendPoint } from "@/modules/dashboard/queries";

/** Compact ₦ for chart axes/tooltips: 1_900_00 kobo → "₦1.9K", 2_450_800_00 → "₦2.5M". */
function compactNaira(kobo: number): string {
  const n = koboToNaira(kobo);
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `₦${Math.round(n / 1_000)}K`;
  return `₦${Math.round(n)}`;
}

/**
 * Revenue Trend — last 7 days of received payments as a bar chart.
 * Mirrors the Stitch dashboard widget: faint bars, today highlighted in brand
 * indigo with a hover tooltip; a 5-step ₦ axis derived from the week's peak.
 */
export function RevenueTrendChart({ data }: { data: RevenueTrendPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.amount));
  // 5 horizontal gridlines / axis ticks, top → bottom.
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((f) => compactNaira(max * f));

  return (
    <div className="mt-4 flex h-64 w-full gap-2">
      {/* Y axis */}
      <div className="flex w-12 flex-col justify-between pb-6 text-right text-[10px] tabular text-text-muted">
        {ticks.map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>

      {/* Plot */}
      <div className="relative flex-1">
        {/* Gridlines */}
        <div className="absolute inset-0 bottom-6 flex flex-col justify-between">
          {ticks.map((_, i) => (
            <div
              key={i}
              className={
                i === ticks.length - 1
                  ? "border-t border-border"
                  : "border-t border-border-subtle"
              }
            />
          ))}
        </div>

        {/* Bars */}
        <div className="absolute inset-0 bottom-6 flex items-end justify-between gap-2">
          {data.map((d, i) => {
            const pct = max > 0 ? (d.amount / max) * 100 : 0;
            return (
              <div
                key={i}
                className="group relative flex h-full w-full items-end"
              >
                <div
                  className={
                    "w-full rounded-t-sm transition-colors " +
                    (d.isToday
                      ? "bg-primary-600"
                      : "bg-primary-200 group-hover:bg-primary-400")
                  }
                  style={{ height: `${Math.max(pct, 2)}%` }}
                />
                <div
                  className={
                    "pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded border border-border bg-surface-raised px-2 py-1 text-[11px] tabular text-text-primary shadow-md transition-opacity " +
                    (d.isToday ? "opacity-100" : "opacity-0 group-hover:opacity-100")
                  }
                >
                  {compactNaira(d.amount)}
                </div>
              </div>
            );
          })}
        </div>

        {/* X axis */}
        <div className="absolute inset-x-0 bottom-0 flex justify-between text-[10px] text-text-muted">
          {data.map((d, i) => (
            <span
              key={i}
              className={
                "w-full text-center " +
                (d.isToday ? "font-[600] text-primary-700" : "")
              }
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
