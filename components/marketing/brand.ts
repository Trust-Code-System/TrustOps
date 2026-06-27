/**
 * Marketing brand constants — the single source of truth for the public site's
 * dark, indigo→violet→fuchsia treatment. Shared by the landing page and every
 * marketing sub-page (Solutions, Pricing, Legal, Support, Community…) so the
 * whole site stays visually consistent. No "use client" here: these are plain
 * values importable from both server and client components.
 */

export const CANVAS = "#0a0712";

export const BRAND_GRADIENT =
  "bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500";

// `inline-block` + right padding extends the clipped gradient background past
// the slanted overhang of the final italic glyph, so the last letter (e.g. the
// "I" in "AI", the "e" in "glance") renders fully instead of being cut off. The
// matching negative margin keeps centered headings perfectly centered.
export const TEXT_GRADIENT =
  "inline-block bg-gradient-to-r from-indigo-300 via-fuchsia-200 to-violet-300 bg-clip-text text-transparent pr-[0.14em] -mr-[0.14em]";

/** Primary (white pill) and ghost (glass outline) button classes. */
export const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-[15px] font-[700] text-[#0a0712] shadow-[0_0_40px_-6px_rgba(168,85,247,0.7)] transition-transform hover:-translate-y-0.5";

export const BTN_GHOST =
  "inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 py-4 text-[15px] font-[700] text-white backdrop-blur transition-colors hover:bg-white/10";

/** Glass card surface used across feature grids and content blocks. */
export const GLASS_CARD =
  "rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-sm";

/** Primary nav — peers in the header; the two product deep-dives nest under
 *  /solutions to avoid colliding with the authenticated app's /analytics. */
export const NAV_LINKS = [
  { label: "Solutions", href: "/solutions" },
  { label: "AI Assistant", href: "/solutions/ai-assistant" },
  { label: "Analytics", href: "/solutions/analytics" },
  { label: "Pricing", href: "/pricing" },
] as const;

export const FOOTER_COLUMNS = [
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Terms of Service", href: "/legal/terms" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Contact Support", href: "/support/contact" },
      { label: "Documentation", href: "/docs" },
    ],
  },
  {
    title: "Community",
    links: [{ label: "Global SME Network", href: "/community" }],
  },
] as const;
