"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionTemplate,
  useInView,
  animate,
  type Variants,
} from "framer-motion";
import {
  Package,
  ScanLine,
  Sparkles,
  LineChart as LineChartIcon,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Store,
  Truck,
  UtensilsCrossed,
  Dumbbell,
  ShoppingBag,
  Star,
  Quote,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/logo";

/**
 * Public marketing landing page (route "/"). Outside the (app) and (auth) route
 * groups, so it renders on the bare root layout — no app shell, no auth gate.
 *
 * Dark, depth-forward SaaS aesthetic: near-black canvas, neon indigo→violet→
 * fuchsia lighting that bleeds from behind content, glassmorphic cards, an
 * editorial serif display face, and scroll-driven motion. The data viz is the
 * centerpiece — professional charts (area, bar, line, donut, sparklines) drawn
 * as crisp, animated SVG so the page reads like a real analytics product.
 *
 * The rest of the product stays on the light design system — this page opts
 * into its own dark treatment locally.
 */

const BRAND_GRADIENT = "bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500";
const TEXT_GRADIENT =
  "bg-gradient-to-r from-indigo-300 via-fuchsia-200 to-violet-300 bg-clip-text text-transparent";

/* ================================================================== */
/* Motion primitives                                                   */
/* ================================================================== */

const reveal: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      variants={reveal}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Counts up to a target the first time it scrolls into view. */
function CountUp({
  to,
  decimals = 0,
  prefix = "",
  suffix = "",
}: {
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setVal(v),
    });
    return () => controls.stop();
  }, [inView, to]);

  return (
    <span ref={ref}>
      {prefix}
      {val.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

/* ================================================================== */
/* Charts                                                              */
/* ================================================================== */

/** Tiny inline trend line for stat tiles. */
function Sparkline({ id, points }: { id: string; points: string }) {
  return (
    <svg viewBox="0 0 80 24" preserveAspectRatio="none" className="mt-2 h-6 w-full" aria-hidden="true">
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
function AreaChart() {
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

        {/* gridlines */}
        {[35, 70, 105].map((y) => (
          <line key={y} x1="10" y1={y} x2="310" y2={y} stroke="#ffffff" strokeOpacity="0.06" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}

        <motion.path
          d="M10,108 L60,88 L112,98 L164,66 L216,74 L268,42 L310,30 L310,130 L10,130 Z"
          fill="url(#areaFill)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
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
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.6, ease: "easeInOut", delay: 0.4 }}
        />
        {/* glowing endpoint */}
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}>
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
function BarChart() {
  const max = Math.max(...BARS.map((b) => b.v));
  return (
    <div className="relative h-52 w-full">
      {/* gridlines */}
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
function LineChart() {
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

          {/* last year — muted, dashed */}
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
          {/* this year — primary */}
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
function DonutChart() {
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

/* ================================================================== */
/* Nav                                                                 */
/* ================================================================== */

function Nav() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0712]/70 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-content items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" aria-label="TrustOps AI home">
          <Logo label="TrustOps AI" size={30} wordmarkClassName="text-white text-[19px] leading-none" />
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          {["Solutions", "AI Assistant", "Analytics", "Pricing"].map((item) => (
            <a
              key={item}
              href="#features"
              className="text-small font-[600] text-white/60 transition-colors hover:text-white"
            >
              {item}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="hidden rounded-full px-4 py-2 text-small font-[600] text-white/70 transition-colors hover:text-white sm:inline-flex"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-small font-[700] text-[#0a0712] shadow-[0_0_24px_-4px_rgba(168,85,247,0.6)] transition-transform hover:-translate-y-0.5"
          >
            Get Started
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

/* ================================================================== */
/* Hero                                                                */
/* ================================================================== */

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const textY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const glowY = useTransform(scrollYProgress, [0, 1], [0, 120]);

  return (
    <section ref={ref} className="relative overflow-hidden bg-[#0a0712]">
      <motion.div style={{ y: glowY }} aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-10%] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-violet-600/30 blur-[120px]" />
        <div className="absolute -left-40 top-40 h-[30rem] w-[30rem] rounded-full bg-indigo-600/25 blur-[120px]" />
        <div className="absolute -right-40 top-20 h-[32rem] w-[32rem] rounded-full bg-fuchsia-600/25 blur-[120px]" />
      </motion.div>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, black, transparent)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, black, transparent)",
        }}
        aria-hidden="true"
      />

      <Nav />

      <div className="relative mx-auto grid max-w-content grid-cols-1 items-center gap-14 px-4 pb-32 pt-16 sm:px-6 lg:grid-cols-2 lg:pt-24">
        <motion.div style={{ y: textY, opacity: textOpacity }}>
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.span
              variants={reveal}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-caption font-[600] uppercase tracking-[0.12em] text-white/90 backdrop-blur"
            >
              <ShieldCheck className="h-4 w-4 text-fuchsia-300" strokeWidth={1.75} />
              Business Operating System
            </motion.span>
            <motion.h1
              variants={reveal}
              className="mt-6 font-display text-[46px] font-[600] leading-[1.04] tracking-[-0.02em] text-white sm:text-[66px]"
            >
              We make your
              <br />
              business <span className={`${TEXT_GRADIENT} italic`}>unstoppable</span>
            </motion.h1>
            <motion.p variants={reveal} className="mt-6 max-w-lg text-[17px] leading-[28px] text-white/60">
              Inventory, sales, and AI-powered insights in one secure operating
              system. Built for modern African SMEs that want to grow.
            </motion.p>
            <motion.div variants={reveal} className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-[15px] font-[700] text-[#0a0712] shadow-[0_0_40px_-6px_rgba(168,85,247,0.7)] transition-transform hover:-translate-y-0.5"
              >
                Get Started for Free
                <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 py-4 text-[15px] font-[700] text-white backdrop-blur transition-colors hover:bg-white/10"
              >
                Explore the platform
              </a>
            </motion.div>
            <motion.p variants={reveal} className="mt-5 text-caption text-white/40">
              Free 14-day trial · No credit card required
            </motion.p>
          </motion.div>
        </motion.div>

        <HeroPreview progress={scrollYProgress} />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[#0a0712]" />
    </section>
  );
}

/** A 3D glass dashboard preview that rotates and lifts as the hero scrolls. */
function HeroPreview({ progress }: { progress: ReturnType<typeof useScroll>["scrollYProgress"] }) {
  const rotateY = useTransform(progress, [0, 1], [-14, 4]);
  const rotateX = useTransform(progress, [0, 1], [8, -2]);
  const y = useTransform(progress, [0, 1], [0, -40]);
  const transform = useMotionTemplate`perspective(1600px) rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      style={{ y }}
      className="relative"
      aria-hidden="true"
    >
      <motion.div
        style={{ transform }}
        className="relative rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_80px_-20px_rgba(99,102,241,0.5)] backdrop-blur-xl"
      >
        <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-br from-white/10 to-transparent" />

        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-caption uppercase tracking-[0.08em] text-white/50">Revenue · This month</p>
            <p className="mt-1 text-metric tabular text-white">₦4.2M</p>
          </div>
          <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-caption font-[700] text-emerald-300">
            ▲ 18.2%
          </span>
        </div>

        <div className="relative mt-5 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
          <AreaChart />
        </div>

        <div className="relative mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-caption uppercase tracking-[0.04em] text-white/50">Orders</p>
            <p className="mt-1 text-h2 tabular text-white">1,204</p>
            <Sparkline id="sparkOrders" points="0,18 16,14 32,16 48,9 64,11 80,4" />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-caption uppercase tracking-[0.04em] text-white/50">Customers</p>
            <p className="mt-1 text-h2 tabular text-white">842</p>
            <Sparkline id="sparkCust" points="0,20 16,16 32,17 48,12 64,8 80,6" />
          </div>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-6 -left-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-2xl backdrop-blur-xl sm:-left-8"
      >
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${BRAND_GRADIENT} text-white shadow-lg`}>
          <TrendingUp className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div>
          <p className="text-caption uppercase tracking-[0.04em] text-white/50">Today</p>
          <p className="text-body-strong tabular text-white">₦450,000</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ================================================================== */
/* Stats band                                                          */
/* ================================================================== */

const STATS = [
  { prefix: "₦", to: 2.4, decimals: 1, suffix: "B+", label: "Processed annually" },
  { to: 10000, decimals: 0, suffix: "+", label: "Active businesses" },
  { to: 99.9, decimals: 1, suffix: "%", label: "Uptime SLA" },
  { to: 4.9, decimals: 1, suffix: "/5", label: "Customer rating" },
];

function StatsBand() {
  return (
    <section className="relative border-y border-white/5 bg-[#0a0712] py-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500/40 to-transparent" aria-hidden="true" />
      <div className="mx-auto grid max-w-content grid-cols-2 gap-8 px-4 sm:px-6 md:grid-cols-4">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.08} className="text-center">
            <p className="font-display text-[34px] font-[600] tabular text-white sm:text-[40px]">
              <CountUp to={s.to} decimals={s.decimals} prefix={s.prefix} suffix={s.suffix} />
            </p>
            <p className="mt-1 text-small text-white/50">{s.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ================================================================== */
/* Features                                                            */
/* ================================================================== */

const BENTO = {
  inventory: {
    icon: Package,
    title: "Smart Inventory",
    body: "Real-time tracking and low-stock alerts keep your shelves stocked and customers happy.",
  },
  sales: {
    icon: ScanLine,
    title: "Atomic Sales",
    body: "Record transactions in seconds — and see exactly how customers pay.",
  },
  ai: {
    icon: Sparkles,
    title: "AI Assistant",
    body: "Your business data, decoded. Powered by Claude.",
  },
  analytics: {
    icon: LineChartIcon,
    title: "Global Analytics",
    body: "Real-time reporting and revenue trends across all your locations.",
  },
} as const;

function GradientIcon({ icon: Icon }: { icon: typeof Package }) {
  return (
    <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${BRAND_GRADIENT} text-white shadow-[0_8px_24px_-6px_rgba(168,85,247,0.7)]`}>
      <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
    </span>
  );
}

const featureCard =
  "group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.05]";

function CardGlow() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      style={{ background: "radial-gradient(400px circle at 50% 0%, rgba(168,85,247,0.18), transparent 70%)" }}
    />
  );
}

function Features() {
  return (
    <section id="features" className="relative bg-[#0a0712] py-28">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[30rem] w-[60rem] -translate-x-1/2 rounded-full bg-violet-700/10 blur-[140px]" aria-hidden="true" />

      <div className="relative mx-auto max-w-content px-4 sm:px-6">
        <Reveal className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="font-display text-metric font-[600] tracking-[-0.02em] text-white sm:text-[42px]">
            Powerful tools, <span className={`${TEXT_GRADIENT} italic`}>simply designed</span>
          </h2>
          <p className="mt-4 text-body text-white/55">
            Everything you need to manage your operations without the cognitive overload.
          </p>
        </Reveal>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 gap-6 md:grid-cols-3"
        >
          {/* Smart Inventory — wide */}
          <motion.div variants={reveal} className={`${featureCard} md:col-span-2`}>
            <CardGlow />
            <div className="relative mb-8">
              <GradientIcon icon={BENTO.inventory.icon} />
              <h3 className="mt-5 text-h3 text-white">{BENTO.inventory.title}</h3>
              <p className="mt-2 text-body text-white/55">{BENTO.inventory.body}</p>
            </div>
            <div className="relative mt-auto rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <BarChart />
            </div>
          </motion.div>

          {/* Atomic Sales — donut */}
          <motion.div variants={reveal} className={featureCard}>
            <CardGlow />
            <div className="relative">
              <GradientIcon icon={BENTO.sales.icon} />
              <h3 className="mt-5 text-h3 text-white">{BENTO.sales.title}</h3>
              <p className="mt-2 text-body text-white/55">{BENTO.sales.body}</p>
            </div>
            <div className="relative mt-8 rounded-2xl border border-white/5 bg-white/[0.02] p-5">
              <DonutChart />
            </div>
          </motion.div>

          {/* AI Assistant — chat */}
          <motion.div variants={reveal} className={featureCard}>
            <CardGlow />
            <div className="relative">
              <GradientIcon icon={BENTO.ai.icon} />
              <h3 className="mt-5 text-h3 text-white">{BENTO.ai.title}</h3>
              <p className="mt-2 text-body text-white/55">{BENTO.ai.body}</p>
            </div>
            <div className="relative mt-8 flex items-start gap-3 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/5 p-4">
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${BRAND_GRADIENT}`}>
                <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={2} aria-hidden="true" />
              </span>
              <p className="text-small italic leading-relaxed text-white/70">
                &ldquo;Sales are up 15% this week. Consider restocking item XYZ before the weekend.&rdquo;
              </p>
            </div>
          </motion.div>

          {/* Global Analytics — wide line chart */}
          <motion.div variants={reveal} className={`${featureCard} md:col-span-2`}>
            <CardGlow />
            <div className="relative mb-8">
              <GradientIcon icon={BENTO.analytics.icon} />
              <h3 className="mt-5 text-h3 text-white">{BENTO.analytics.title}</h3>
              <p className="mt-2 text-body text-white/55">{BENTO.analytics.body}</p>
            </div>
            <div className="relative mt-auto rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <LineChart />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ================================================================== */
/* How it works                                                        */
/* ================================================================== */

const STEPS = [
  { n: "01", icon: Package, title: "Add your stock", body: "Import products in bulk or scan them in. Set prices, costs, and reorder points once." },
  { n: "02", icon: ScanLine, title: "Sell & invoice", body: "Record sales in seconds and send professional invoices. Inventory updates itself." },
  { n: "03", icon: Sparkles, title: "Grow with AI", body: "Ask questions in plain language and get insights that tell you what to do next." },
];

function HowItWorks() {
  return (
    <section className="relative bg-[#0a0712] py-28">
      <div className="mx-auto max-w-content px-4 sm:px-6">
        <Reveal className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="font-display text-metric font-[600] tracking-[-0.02em] text-white sm:text-[42px]">
            Up and running <span className={`${TEXT_GRADIENT} italic`}>in minutes</span>
          </h2>
          <p className="mt-4 text-body text-white/55">Three steps from spreadsheet chaos to a calm, connected business.</p>
        </Reveal>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="relative grid grid-cols-1 gap-6 md:grid-cols-3"
        >
          {/* connecting line on desktop */}
          <div className="pointer-events-none absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-white/10 to-transparent md:block" aria-hidden="true" />
          {STEPS.map((s) => (
            <motion.div
              key={s.n}
              variants={reveal}
              className="relative rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${BRAND_GRADIENT} text-white shadow-[0_8px_24px_-6px_rgba(168,85,247,0.7)]`}>
                  <s.icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span className="font-display text-[40px] font-[600] leading-none text-white/10">{s.n}</span>
              </div>
              <h3 className="mt-6 text-h3 text-white">{s.title}</h3>
              <p className="mt-2 text-body text-white/55">{s.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ================================================================== */
/* Trust + testimonial                                                 */
/* ================================================================== */

const INDUSTRIES = [
  { icon: Store, label: "Retail" },
  { icon: Truck, label: "Logistics" },
  { icon: UtensilsCrossed, label: "Food & Bev" },
  { icon: Dumbbell, label: "Fitness" },
  { icon: ShoppingBag, label: "Commerce" },
];

function Trust() {
  return (
    <section className="bg-[#0a0712] pb-8 pt-4">
      <div className="mx-auto max-w-content px-4 text-center sm:px-6">
        <Reveal>
          <p className="mb-8 text-caption uppercase tracking-[0.1em] text-white/40">
            Trusted by 10,000+ businesses across Nigeria and beyond
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {INDUSTRIES.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 backdrop-blur-sm transition-colors hover:border-white/20 hover:bg-white/[0.07]"
              >
                <Icon className="h-[18px] w-[18px] text-fuchsia-300/90" strokeWidth={1.75} aria-hidden="true" />
                <span className="text-small font-[600] text-white/75">{label}</span>
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Testimonial() {
  return (
    <section className="bg-[#0a0712] py-20">
      <div className="mx-auto max-w-content px-4 sm:px-6">
        <Reveal>
          <figure className="relative mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-10 text-center backdrop-blur-sm sm:p-14">
            <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-violet-600/15 blur-3xl" aria-hidden="true" />
            <Quote className="mx-auto h-10 w-10 text-fuchsia-300/60" strokeWidth={1.5} aria-hidden="true" />
            <blockquote className="relative mt-6 font-display text-[24px] font-[500] italic leading-[1.4] text-white sm:text-[30px]">
              &ldquo;TrustOps replaced four spreadsheets and a notebook. I finally
              know my numbers — and the AI tells me what to restock before I run out.&rdquo;
            </blockquote>
            <div className="mt-8 flex items-center justify-center gap-1" aria-label="5 out of 5 stars">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-fuchsia-300 text-fuchsia-300" aria-hidden="true" />
              ))}
            </div>
            <figcaption className="mt-4 text-small text-white/55">
              <span className="font-[700] text-white/80">Amara Okafor</span> · Founder, Bloom Grocers (Lagos)
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}

/* ================================================================== */
/* Final CTA + footer                                                  */
/* ================================================================== */

function FinalCta() {
  return (
    <section className="bg-[#0a0712] px-4 pb-28 pt-8 sm:px-6">
      <Reveal>
        <div className={`relative mx-auto max-w-content overflow-hidden rounded-[2.5rem] ${BRAND_GRADIENT} px-6 py-20 text-center shadow-[0_40px_120px_-30px_rgba(168,85,247,0.8)]`}>
          <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-fuchsia-300/30 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-indigo-300/30 blur-3xl" aria-hidden="true" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-metric-lg font-[600] tracking-[-0.02em] text-white sm:text-[46px]">
              Join the future of SME operations.
            </h2>
            <p className="mt-5 text-[17px] leading-[28px] text-white/85">
              Stop wrestling with spreadsheets. Start growing with TrustOps AI.
            </p>
            <Link
              href="/signup"
              className="mt-10 inline-flex items-center gap-2 rounded-full bg-white px-10 py-4 text-[15px] font-[700] text-[#0a0712] shadow-xl transition-transform hover:-translate-y-0.5"
            >
              Build Your Business Today
              <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  const columns = [
    { title: "Legal", links: ["Privacy Policy", "Terms of Service"] },
    { title: "Support", links: ["Contact Support", "Documentation"] },
    { title: "Community", links: ["Global SME Network"] },
  ];
  return (
    <footer className="border-t border-white/5 bg-[#070510] py-14">
      <div className="mx-auto flex max-w-content flex-col justify-between gap-10 px-4 sm:px-6 md:flex-row">
        <div>
          <span className="flex items-center gap-2">
            <LogoMark size={28} />
            <span className="font-display text-[19px] font-[600] text-white">TrustOps AI</span>
          </span>
          <p className="mt-4 max-w-xs text-small text-white/40">
            © {new Date().getFullYear()} TrustOps AI. Empowering African SMEs.
          </p>
        </div>
        <nav className="flex flex-col gap-8 md:flex-row md:gap-12" aria-label="Footer">
          {columns.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <span className="text-caption uppercase tracking-[0.05em] text-fuchsia-300/80">{col.title}</span>
              {col.links.map((link) => (
                <a key={link} href="#" className="text-small text-white/45 transition-colors hover:text-white">
                  {link}
                </a>
              ))}
            </div>
          ))}
        </nav>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-dvh bg-[#0a0712]">
      <Hero />
      <StatsBand />
      <Features />
      <HowItWorks />
      <Trust />
      <Testimonial />
      <FinalCta />
      <Footer />
    </main>
  );
}
