"use client";

import { motion } from "framer-motion";

/**
 * Animated SVG data-viz used across the marketing site (landing + the Analytics
 * deep-dive). Pure presentation, drawn crisp so the pages read like a real
 * analytics product. Shared so the look stays identical everywhere.
 */

/** Tiny inline trend line for stat tiles. */
export function Sparkline({ id, points }: { id: string; points: string }) {
  return (
    <svg
      viewBox="0 0 80 24"
      preserveAspectRatio="none"
      className="mt-2 h-6 w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#e879f9" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Revenue area chart: gridlines, gradient fill, drawn line, glowing endpoint. */
export function AreaChart() {
  const line = "10,108 60,88 112,98 164,66 216,74 268,42 310,30";
  return (
    <div className="w-full" style={{ aspectRatio: "320 / 140" }}>
      <svg viewBox="0 0 320 140" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="areaStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#e879f9" />
          </linearGradient>
        </defs>

        {[35, 70, 105].map((y) => (
          <line key={y} x1="10" y1={y} x2="310" y2={y} stroke="#ffffff" strokeOpacity="0.06" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}

        <motion.path
          d="M10,108 L60,88 L112,98 L164,66 L216,74 L268,42 L310,30 L310,130 L10,130 Z"
          fill="url(#areaFill)"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.6 }}
        />
        <motion.polyline
          points={line}
          fill="none"
          stroke="url(#areaStroke)"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, ease: "easeInOut", delay: 0.4 }}
        />
        <motion.g initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1.6 }}>
          <circle cx="310" cy="30" r="7" fill="#e879f9" fillOpacity="0.3" />
          <circle cx="310" cy="30" r="3.5" fill="#fff" stroke="#e879f9" strokeWidth="2" />
        </motion.g>
      </svg>
    </div>
  );
}

const BARS = [
  { m: "Jan", v: 42 },
  { m: "Feb", v: 55 },
  { m: "Mar", v: 48 },
  { m: "Apr", v: 68 },
  { m: "May", v: 60 },
  { m: "Jun", v: 75 },
  { m: "Jul", v: 66 },
  { m: "Aug", v: 88 },
];

/** Inventory bar chart: baseline gridlines, value labels, highlighted peak. */
export function BarChart() {
  const max = Math.max(...BARS.map((b) => b.v));
  return (
    <div className="relative h-52 w-full">
      {[0, 25, 50, 75, 100].map((p) => (
        <div key={p} className="absolute inset-x-0 h-px bg-white/[0.06]" style={{ bottom: `${p}%` }} />
      ))}
      <div className="relative flex h-full items-end gap-1.5 sm:gap-2.5">
        {BARS.map((b, i) => {
          const peak = b.v === max;
          return (
            <div key={b.m} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <span className={`text-[10px] font-[600] tabular ${peak ? "text-fuchsia-200" : "text-white/35"}`}>
                {b.v}
              </span>
              <motion.div
                className={`w-full rounded-t-md ${
                  peak
                    ? "bg-gradient-to-t from-fuchsia-500 to-fuchsia-300 shadow-[0_0_20px_-2px_rgba(232,121,249,0.7)]"
                    : "bg-gradient-to-t from-indigo-500/70 to-violet-400/70"
                }`}
                initial={{ height: 0 }}
                whileInView={{ height: `${(b.v / 100) * 88}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              />
              <span className="text-[10px] text-white/30">{b.m}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Analytics line chart: two series, gridlines, markers, legend. */
export function LineChart() {
  const thisYear = "12,120 78,100 144,110 210,64 276,80 342,40 388,28";
  const lastYear = "12,135 78,128 144,120 210,110 276,112 342,96 388,88";
  const pts = thisYear.split(" ").map((p) => p.split(",").map(Number) as [number, number]);

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center gap-5">
        <span className="flex items-center gap-2 text-caption text-white/60">
          <span className="h-2 w-2 rounded-full bg-fuchsia-400" /> This year
        </span>
        <span className="flex items-center gap-2 text-caption text-white/40">
          <span className="h-2 w-2 rounded-full bg-white/30" /> Last year
        </span>
      </div>
      <div className="w-full" style={{ aspectRatio: "400 / 170" }}>
        <svg viewBox="0 0 400 170" preserveAspectRatio="none" className="h-full w-full">
          <defs>
            <linearGradient id="lineStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#e879f9" />
            </linearGradient>
          </defs>

          {[30, 70, 110, 150].map((y) => (
            <line key={y} x1="12" y1={y} x2="388" y2={y} stroke="#ffffff" strokeOpacity="0.06" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}

          <motion.polyline
            points={lastYear}
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.25"
            strokeWidth="2"
            strokeDasharray="4 5"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
          />
          <motion.polyline
            points={thisYear}
            fill="none"
            stroke="url(#lineStroke)"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.6, ease: "easeInOut" }}
          />
          {pts.map(([x, y], i) => (
            <motion.circle
              key={i}
              cx={x}
              cy={y}
              r="3.5"
              fill="#0a0712"
              stroke="url(#lineStroke)"
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 + i * 0.08 }}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

const DONUT = [
  { label: "Cash", val: 45, color: "#6366f1" },
  { label: "Transfer", val: 35, color: "#a855f7" },
  { label: "Card", val: 20, color: "#e879f9" },
];

/** Payment-mix donut with legend. */
export function DonutChart() {
  const R = 46;
  const C = 2 * Math.PI * R;
  let acc = 0;
  const segs = DONUT.map((s) => {
    const seg = { ...s, dash: (s.val / 100) * C, offset: -(acc / 100) * C };
    acc += s.val;
    return seg;
  });

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-28 w-28 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={R} fill="none" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="12" />
          {segs.map((s) => (
            <motion.circle
              key={s.label}
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${s.dash} ${C - s.dash}`}
              strokeDashoffset={s.offset}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-h3 tabular text-white">100%</span>
          <span className="text-[10px] uppercase tracking-wide text-white/40">paid</span>
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {DONUT.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-small text-white/60">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="font-[600] text-white/80">{s.val}%</span>
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
