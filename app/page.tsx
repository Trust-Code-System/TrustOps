"use client";

import Link from "next/link";
import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionTemplate,
  type Variants,
} from "framer-motion";
import {
  Package,
  ScanLine,
  Sparkles,
  LineChart,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Store,
  Truck,
  UtensilsCrossed,
  Dumbbell,
  ShoppingBag,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/logo";

/**
 * Public marketing landing page (route "/"). Outside the (app) and (auth) route
 * groups, so it renders on the bare root layout — no app shell, no auth gate.
 *
 * Dark, depth-forward SaaS aesthetic: near-black canvas, neon indigo→violet→
 * fuchsia lighting that bleeds from behind content, glassmorphic cards, and
 * scroll-driven motion (reveal-on-enter, parallax, a 3D dashboard that rotates
 * as you scroll). The rest of the product stays on the light design system —
 * this page opts into its own dark treatment locally.
 */

// The signature gradient, reused on every accent surface for consistency.
const BRAND_GRADIENT = "bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500";
const TEXT_GRADIENT =
  "bg-gradient-to-r from-indigo-300 via-fuchsia-200 to-violet-300 bg-clip-text text-transparent";

/* ------------------------------------------------------------------ */
/* Motion primitives                                                   */
/* ------------------------------------------------------------------ */

const reveal: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

/** Fades + lifts its children into view the first time they enter the viewport. */
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

/* ------------------------------------------------------------------ */
/* Shared chrome                                                       */
/* ------------------------------------------------------------------ */

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
            className="group relative inline-flex items-center overflow-hidden rounded-full bg-white px-5 py-2.5 text-small font-[700] text-[#0a0712] shadow-[0_0_24px_-4px_rgba(168,85,247,0.6)] transition-transform hover:-translate-y-0.5"
          >
            Get Started
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // Parallax: the text drifts up and fades, the light pool drifts down.
  const textY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const glowY = useTransform(scrollYProgress, [0, 1], [0, 120]);

  return (
    <section ref={ref} className="relative overflow-hidden bg-[#0a0712]">
      {/* Lighting — radial pools that bleed from behind the content. */}
      <motion.div
        style={{ y: glowY }}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute left-1/2 top-[-10%] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-violet-600/30 blur-[120px]" />
        <div className="absolute -left-40 top-40 h-[30rem] w-[30rem] rounded-full bg-indigo-600/25 blur-[120px]" />
        <div className="absolute -right-40 top-20 h-[32rem] w-[32rem] rounded-full bg-fuchsia-600/25 blur-[120px]" />
      </motion.div>

      {/* Fine grid sheen, masked so it fades toward the edges. */}
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
            <motion.p
              variants={reveal}
              className="mt-6 max-w-lg text-[17px] leading-[28px] text-white/60"
            >
              Inventory, sales, and AI-powered insights in one secure operating
              system. Built for modern African SMEs that want to grow.
            </motion.p>
            <motion.div variants={reveal} className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-[15px] font-[700] text-[#0a0712] shadow-[0_0_40px_-6px_rgba(168,85,247,0.7)] transition-transform hover:-translate-y-0.5"
              >
                Get Started for Free
                <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-4 text-[15px] font-[700] text-white backdrop-blur transition-colors hover:bg-white/10"
              >
                Book a Demo
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        <HeroPreview progress={scrollYProgress} />
      </div>

      {/* Bottom fade into the next section. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[#0a0712]" />
    </section>
  );
}

/** A 3D glass dashboard preview that rotates and lifts as the hero scrolls. */
function HeroPreview({
  progress,
}: {
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
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
        {/* Inner glass sheen */}
        <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-br from-white/10 to-transparent" />

        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-caption uppercase tracking-[0.08em] text-white/50">
              Revenue
            </p>
            <p className="mt-1 text-metric tabular text-white">₦4.2M</p>
          </div>
          <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-caption font-[700] text-emerald-300">
            ▲ 18.2%
          </span>
        </div>

        {/* Gradient area chart */}
        <div className="relative mt-5 h-40 w-full overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-3">
          <svg viewBox="0 0 360 130" preserveAspectRatio="none" className="h-full w-full">
            <defs>
              <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="stroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#e879f9" />
              </linearGradient>
            </defs>
            <path d="M0,100 60,80 120,90 180,50 240,62 300,30 360,42 360,130 0,130 Z" fill="url(#area)" />
            <motion.polyline
              points="0,100 60,80 120,90 180,50 240,62 300,30 360,42"
              fill="none"
              stroke="url(#stroke)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.6, ease: "easeInOut", delay: 0.6 }}
            />
          </svg>
        </div>

        <div className="relative mt-4 grid grid-cols-2 gap-3">
          {[
            { label: "Orders", value: "1,204" },
            { label: "Customers", value: "842" },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <p className="text-caption uppercase tracking-[0.04em] text-white/50">{m.label}</p>
              <p className="mt-1 text-h2 tabular text-white">{m.value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Floating gradient chip — drifts gently in front of the card. */}
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

/* ------------------------------------------------------------------ */
/* Features                                                            */
/* ------------------------------------------------------------------ */

const BENTO = {
  inventory: {
    icon: Package,
    title: "Smart Inventory",
    body: "Real-time tracking and low-stock alerts keep your shelves stocked and customers happy.",
  },
  sales: {
    icon: ScanLine,
    title: "Atomic Sales",
    body: "Record transactions in seconds with professional invoices.",
  },
  ai: {
    icon: Sparkles,
    title: "AI Assistant",
    body: "Your business data, decoded. Powered by Claude.",
  },
  analytics: {
    icon: LineChart,
    title: "Global Analytics",
    body: "Real-time reporting and revenue trends across all your locations.",
  },
} as const;

/** Gradient icon tile — the recurring 3D accent across feature cards. */
function GradientIcon({ icon: Icon }: { icon: typeof Package }) {
  return (
    <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${BRAND_GRADIENT} text-white shadow-[0_8px_24px_-6px_rgba(168,85,247,0.7)]`}>
      <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
    </span>
  );
}

const featureCard =
  "group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.05]";

/** Soft glow that fades in on hover behind a card. */
function CardGlow() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      style={{
        background:
          "radial-gradient(400px circle at 50% 0%, rgba(168,85,247,0.18), transparent 70%)",
      }}
    />
  );
}

function Features() {
  return (
    <section id="features" className="relative bg-[#0a0712] py-28">
      {/* ambient lighting */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[30rem] w-[60rem] -translate-x-1/2 rounded-full bg-violet-700/10 blur-[140px]" aria-hidden="true" />

      <div className="relative mx-auto max-w-content px-4 sm:px-6">
        <Reveal className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="font-display text-metric font-[600] tracking-[-0.02em] text-white sm:text-[42px]">
            Powerful tools, <span className={`${TEXT_GRADIENT} italic`}>simply designed</span>
          </h2>
          <p className="mt-4 text-body text-white/55">
            Everything you need to manage your operations without the cognitive
            overload.
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
            <div className="relative mt-auto flex h-48 items-end justify-between gap-2 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              {[35, 55, 42, 68, 50, 75, 60, 88].map((h, i) => (
                <motion.div
                  key={i}
                  className="w-full rounded-t-md bg-gradient-to-t from-indigo-500 to-fuchsia-400"
                  initial={{ height: 0 }}
                  whileInView={{ height: `${h}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                />
              ))}
            </div>
          </motion.div>

          {/* Atomic Sales */}
          <motion.div variants={reveal} className={featureCard}>
            <CardGlow />
            <div className="relative">
              <GradientIcon icon={BENTO.sales.icon} />
              <h3 className="mt-5 text-h3 text-white">{BENTO.sales.title}</h3>
              <p className="mt-2 text-body text-white/55">{BENTO.sales.body}</p>
            </div>
            <Link
              href="/signup"
              className={`relative mt-8 flex w-full items-center justify-center gap-2 rounded-full ${BRAND_GRADIENT} px-4 py-3 text-[15px] font-[700] text-white shadow-[0_8px_24px_-6px_rgba(168,85,247,0.7)] transition-transform hover:-translate-y-0.5`}
            >
              Record Sale
              <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </motion.div>

          {/* AI Assistant */}
          <motion.div variants={reveal} className={featureCard}>
            <CardGlow />
            <div className="relative">
              <GradientIcon icon={BENTO.ai.icon} />
              <h3 className="mt-5 text-h3 text-white">{BENTO.ai.title}</h3>
              <p className="mt-2 text-body text-white/55">{BENTO.ai.body}</p>
            </div>
            <div className="relative mt-8 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/5 p-4">
              <p className="text-small italic text-white/70">
                &ldquo;Sales are up 15% this week. Consider restocking item
                XYZ.&rdquo;
              </p>
            </div>
          </motion.div>

          {/* Global Analytics — wide */}
          <motion.div variants={reveal} className={`${featureCard} md:col-span-2`}>
            <CardGlow />
            <div className="relative mb-8">
              <GradientIcon icon={BENTO.analytics.icon} />
              <h3 className="mt-5 text-h3 text-white">{BENTO.analytics.title}</h3>
              <p className="mt-2 text-body text-white/55">{BENTO.analytics.body}</p>
            </div>
            <div className="relative mt-auto h-48 w-full overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-3">
              <svg viewBox="0 0 400 160" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
                <defs>
                  <linearGradient id="analytics-stroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#e879f9" />
                  </linearGradient>
                </defs>
                <motion.polyline
                  points="0,130 60,110 120,120 180,70 240,85 300,40 360,55 400,20"
                  fill="none"
                  stroke="url(#analytics-stroke)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.6, ease: "easeInOut" }}
                />
              </svg>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Trust                                                               */
/* ------------------------------------------------------------------ */

const INDUSTRIES = [
  { icon: Store, label: "Retail" },
  { icon: Truck, label: "Logistics" },
  { icon: UtensilsCrossed, label: "Food & Bev" },
  { icon: Dumbbell, label: "Fitness" },
  { icon: ShoppingBag, label: "Commerce" },
];

function Trust() {
  return (
    <section className="bg-[#0a0712] py-20">
      <div className="mx-auto max-w-content px-4 text-center sm:px-6">
        <Reveal>
          <p className="mb-8 text-caption uppercase tracking-[0.1em] text-white/40">
            Trusted by 10,000+ businesses across Nigeria and beyond
          </p>
          {/* Labeled glass chips — icon + name reads clearer and more
              professional than bare floating glyphs. */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {INDUSTRIES.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 backdrop-blur-sm transition-colors hover:border-white/20 hover:bg-white/[0.07]"
              >
                <Icon
                  className="h-[18px] w-[18px] text-fuchsia-300/90"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <span className="text-small font-[600] text-white/75">{label}</span>
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Final CTA                                                           */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

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
              <span className="text-caption uppercase tracking-[0.05em] text-fuchsia-300/80">
                {col.title}
              </span>
              {col.links.map((link) => (
                <a
                  key={link}
                  href="#"
                  className="text-small text-white/45 transition-colors hover:text-white"
                >
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
      <Features />
      <Trust />
      <FinalCta />
      <Footer />
    </main>
  );
}
