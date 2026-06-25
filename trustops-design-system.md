# TrustOps AI — Design System Spec

> This is the single source of truth for all UI. Every screen, component, and page must derive its colors, spacing, type, and behavior from this document. Do not invent new tokens. If something isn't here, extend this file first, then build.

**Personality:** Clean, trustworthy, banking-grade. Calm. Generous white space.
**Mode:** Light only.
**Platform priority:** Mobile-first. Most users are on phones.
**Core principle:** Color carries meaning. Indigo = brand/action. Emerald = money-positive. Red = money-negative. Gray = everything else. Color is never decoration.

---

## 1. Design Tokens

All tokens are CSS variables. Define once in `globals.css` under `:root`. Tailwind reads from these. Never hardcode a hex value in a component.

### 1.1 Color

```css
:root {
  /* Brand — Indigo */
  --color-primary-50:  #EEF0FB;
  --color-primary-100: #D9DDF6;
  --color-primary-200: #B3BBED;
  --color-primary-300: #8D99E4;
  --color-primary-400: #6777DB;
  --color-primary-500: #4255D2;  /* base brand */
  --color-primary-600: #3544A8;  /* primary button, links */
  --color-primary-700: #28337E;  /* hover/pressed */
  --color-primary-800: #1B2254;
  --color-primary-900: #0E122A;

  /* Neutrals — near-true gray, slight cool cast */
  --color-gray-50:  #F8F9FA;   /* app background */
  --color-gray-100: #F1F3F5;   /* subtle fill, hover row */
  --color-gray-200: #E9ECEF;   /* borders, dividers */
  --color-gray-300: #DEE2E6;   /* input border */
  --color-gray-400: #CED4DA;   /* disabled border */
  --color-gray-500: #ADB5BD;   /* placeholder text */
  --color-gray-600: #868E96;   /* muted/secondary text */
  --color-gray-700: #495057;   /* body text secondary */
  --color-gray-800: #343A40;   /* body text */
  --color-gray-900: #212529;   /* headings, primary text */

  /* Semantic — Money & status. Use ONLY for meaning. */
  --color-success-50:  #E6F7EF;
  --color-success-500: #10A769;  /* paid, revenue up, in stock */
  --color-success-700: #0A7048;

  --color-danger-50:   #FDEAEA;
  --color-danger-500:  #E03131;  /* unpaid, revenue down, out of stock */
  --color-danger-700:  #A51F1F;

  --color-warning-50:  #FFF6E6;
  --color-warning-500: #F08C00;  /* low stock, due soon, pending */
  --color-warning-700: #B36A00;

  --color-info-50:     #E7F1FB;
  --color-info-500:    #1C7ED6;  /* neutral informational only */

  /* Surfaces */
  --surface-page:    var(--color-gray-50);
  --surface-card:    #FFFFFF;
  --surface-raised:  #FFFFFF;
  --surface-overlay: rgba(14, 18, 42, 0.45); /* modal scrim, primary-900 based */

  /* Text */
  --text-primary:   var(--color-gray-900);
  --text-secondary: var(--color-gray-700);
  --text-muted:     var(--color-gray-600);
  --text-on-primary:#FFFFFF;
  --text-disabled:  var(--color-gray-500);

  /* Border */
  --border-subtle:  var(--color-gray-200);
  --border-default: var(--color-gray-300);
  --border-strong:  var(--color-gray-400);
  --border-focus:   var(--color-primary-500);
}
```

**Money color rule (enforce everywhere):**
- A positive money figure or "Paid" status uses `--color-success-500`.
- A negative figure, "Unpaid", "Overdue", or "Out of stock" uses `--color-danger-500`.
- "Pending", "Due soon", "Low stock" uses `--color-warning-500`.
- A plain neutral number (e.g. a count of customers) stays `--text-primary`. Do not color it.

This single rule is what makes the product feel like a bank and not a toy. Hold the line on it.

### 1.2 Typography

Two faces. A characterful-but-legible display/UI face, and a tabular-friendly approach for numbers. Banking-grade means **numbers must align**.

```css
:root {
  --font-sans: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-numeric: "Inter", sans-serif; /* use font-variant-numeric: tabular-nums */
}
```

Load Inter via `next/font` (self-hosted, no layout shift). All monetary and table-numeric values get `font-variant-numeric: tabular-nums;` so columns line up.

**Type scale** (mobile → desktop where it differs):

| Token        | Size / Line height        | Weight | Use                                  |
|--------------|---------------------------|--------|--------------------------------------|
| `display`    | 28px/34 → 36px/42         | 700    | Page titles, big metric values        |
| `h1`         | 24px/30                   | 700    | Section headers                       |
| `h2`         | 20px/28                   | 600    | Card titles                           |
| `h3`         | 16px/24                   | 600    | Sub-sections, table group headers     |
| `body`       | 15px/24                   | 400    | Default text                          |
| `body-strong`| 15px/24                   | 600    | Emphasis in body                      |
| `small`      | 13px/20                   | 400    | Secondary info, helper text           |
| `caption`    | 12px/16                   | 500    | Labels, badges, table headers (UPPER) |
| `metric`     | 32px/38 → 40px/46         | 700    | Dashboard KPI numbers, tabular-nums   |

Rules:
- Sentence case everywhere except `caption` labels which may be UPPERCASE with `letter-spacing: 0.04em`.
- Never more than 3 type sizes visible in one card.
- Body text is never lighter than `--text-secondary` for content the user must read.

### 1.3 Spacing

4px base grid. Use only these steps.

```
--space-1: 4px    --space-2: 8px    --space-3: 12px   --space-4: 16px
--space-5: 20px   --space-6: 24px   --space-8: 32px   --space-10: 40px
--space-12: 48px  --space-16: 64px
```

- Card internal padding: `--space-6` (24px) desktop, `--space-4` (16px) mobile.
- Gap between cards/sections: `--space-6`.
- Form field vertical rhythm: `--space-4` between fields.
- Page gutter: `--space-4` mobile, `--space-8` desktop.

### 1.4 Radius, border, shadow

```css
:root {
  --radius-sm: 6px;    /* inputs, badges */
  --radius-md: 10px;   /* buttons, cards */
  --radius-lg: 14px;   /* modals, large panels */
  --radius-full: 9999px;

  --border-width: 1px;

  /* Shadows — soft, low, never heavy. Banking = restraint. */
  --shadow-xs: 0 1px 2px rgba(16, 24, 40, 0.05);
  --shadow-sm: 0 1px 3px rgba(16, 24, 40, 0.06), 0 1px 2px rgba(16,24,40,0.04);
  --shadow-md: 0 4px 8px -2px rgba(16, 24, 40, 0.08), 0 2px 4px -2px rgba(16,24,40,0.04);
  --shadow-lg: 0 12px 16px -4px rgba(16, 24, 40, 0.08), 0 4px 6px -2px rgba(16,24,40,0.03);
}
```

Cards use `--shadow-xs` or a `1px` border, not both. Modals use `--shadow-lg`. No glows, no colored shadows.

### 1.5 Motion

Calm and quick. Motion confirms an action; it never performs.

```css
:root {
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --dur-fast: 120ms;
  --dur-base: 180ms;
  --dur-slow: 240ms;
}
```

- Hover/press feedback: `--dur-fast`.
- Modal/drawer enter: `--dur-base` with `--ease-out`.
- Never animate longer than 240ms in core flows.
- Respect `prefers-reduced-motion`: disable all non-essential transitions.

---

## 2. Layout System

### 2.1 App shell

```
┌──────────────────────────────────────────────┐
│ TOP BAR  [≡] TrustOps    [branch ▾]   [🔔][👤]│  56px, white, border-bottom
├──────────┬───────────────────────────────────┤
│          │                                    │
│ SIDEBAR  │   PAGE CONTENT                     │
│ 240px    │   max-width 1200px, centered       │
│ (collapses│  gutter 32px                       │
│  to icons │                                    │
│  < 1024px,│                                    │
│  to bottom│                                    │
│  tab bar  │                                    │
│  on mobile)                                    │
│          │                                    │
└──────────┴───────────────────────────────────┘
```

- **Desktop (≥1024px):** fixed left sidebar, 240px.
- **Tablet (768–1023px):** sidebar collapses to 64px icon rail.
- **Mobile (<768px):** sidebar becomes a bottom tab bar with the 4–5 primary destinations; overflow goes into a "More" sheet. Top bar stays.

### 2.2 Bottom tab bar (mobile) — primary nav

5 slots max: **Home · Sales · Customers · Inventory · More**. The "Record sale" action is a center floating action button (FAB) that overlaps the tab bar — it's the fastest path in the app and must always be one tap away.

### 2.3 Content widths

- Dashboard / lists: full content width up to 1200px.
- Forms / detail / settings: constrain to 640px for readability.
- Reading never exceeds ~75 characters per line.

### 2.4 Breakpoints

```
sm: 640px   md: 768px   lg: 1024px   xl: 1280px
```

---

## 3. Core Components

Each component below is the canonical version. Build them once in `/components/ui`, reuse everywhere. No per-page variants.

### 3.1 Button

Variants: `primary`, `secondary`, `ghost`, `danger`. Sizes: `sm` (32px), `md` (40px), `lg` (48px). `md` is default. Mobile primary actions use `lg`.

| Variant   | Bg                | Text            | Border          | Hover                 |
|-----------|-------------------|-----------------|-----------------|-----------------------|
| primary   | primary-600       | white           | none            | primary-700           |
| secondary | white             | gray-800        | gray-300        | gray-50 bg            |
| ghost     | transparent       | gray-700        | none            | gray-100 bg           |
| danger    | danger-500        | white           | none            | danger-700            |

- Radius `--radius-md`. Font `body-strong`. Padding `--space-3` / `--space-5`.
- Disabled: 40% opacity, no pointer.
- Loading: spinner replaces label, width locked (no layout shift), button disabled.
- Focus: 2px `--border-focus` ring with 2px offset. Always visible on keyboard focus.
- Icon+label: icon 18px, gap `--space-2`.

### 3.2 Input / Select / Textarea

- Height 40px (44px on mobile for touch). Radius `--radius-sm`. Border `--border-default`.
- Focus: border → `--border-focus`, plus 3px `--color-primary-100` ring.
- Error: border → `--color-danger-500`, helper text danger, `small` size.
- Label above field, `caption` weight 500, `--text-secondary`. Required marked with a muted asterisk, never red by default.
- Placeholder is `--color-gray-500`, never used as a label substitute.
- Money inputs: right-aligned, tabular-nums, currency prefix (₦) in a muted leading addon.

### 3.3 Card

White surface, `--radius-md`, `--shadow-xs` OR `1px --border-subtle` (not both), padding per spacing rules. Optional header row: `h2` title left, action/menu right.

### 3.4 Badge / Status pill

Pill (`--radius-full`), `caption` uppercase, `--space-1`/`--space-3` padding. Background is the semantic `-50`, text is the semantic `-700`.

| Status        | Tokens                          |
|---------------|---------------------------------|
| Paid          | success-50 bg / success-700 text|
| Unpaid/Overdue| danger-50 / danger-700          |
| Pending/Due   | warning-50 / warning-700        |
| Draft/Neutral | gray-100 / gray-700             |
| In stock      | success-50 / success-700        |
| Low stock     | warning-50 / warning-700        |
| Out of stock  | danger-50 / danger-700          |

### 3.5 Table / Data list

- Header row: `caption` UPPERCASE, `--text-muted`, `--color-gray-50` bg, sticky on scroll.
- Row height 52px. Divider `--border-subtle`. Row hover `--color-gray-50`.
- Money columns right-aligned, tabular-nums.
- **Mobile: tables collapse to stacked cards.** Each row becomes a card with label/value pairs. Never horizontal-scroll a data table on mobile.
- Every table has: a loading skeleton state, an empty state, and pagination (or infinite scroll for long lists).

### 3.6 Metric / KPI card

Dashboard hero element. Layout:
```
┌─────────────────────────┐
│ TOTAL REVENUE      (caption, muted)
│ ₦2,480,000         (metric, tabular-nums)
│ ▲ 12% vs last week (small, success-500 if up / danger if down)
└─────────────────────────┘
```
The delta line is the ONLY place trend color appears on the dashboard. The big number stays neutral `--text-primary` — it's a fact, not a judgment.

### 3.7 Modal & Drawer

- Modal: centered, max-width 480px (confirm) / 640px (form), `--radius-lg`, `--shadow-lg`, scrim `--surface-overlay`.
- Mobile: modals become bottom sheets that slide up, with a drag handle.
- Destructive confirms use the `danger` button and name the exact consequence ("Archive invoice #1042"), never a vague "Are you sure?".

### 3.8 Toast

Bottom-center mobile, bottom-right desktop. Auto-dismiss 4s. Success = success-500 left accent, error = danger. Action verbs match the trigger: tap "Save" → toast says "Saved".

### 3.9 Empty states

Every list/table/dashboard widget needs one. Structure: a simple line icon, one `h3` line saying what's missing, one `small` line of direction, one primary button to act. Tone: an invitation, not an apology. Example for customers: "No customers yet" / "Add your first customer to start recording sales" / [Add customer].

### 3.10 Forms

- One column always (banking forms are scannable top-to-bottom, never multi-column on the fields users fill fast).
- Group related fields under a `h3` sub-header with a divider.
- Primary action bottom-right (desktop) / full-width pinned bottom (mobile).
- Validate on blur, not on every keystroke. Show success silently (no green checks on every field — that's noise).
- The "Record sale" form is the most optimized: minimum fields, smart defaults, keyboard/numeric inputs correct, submit reachable without scrolling on a standard phone.

---

## 4. Iconography & Imagery

- One icon set only: **Lucide** (line icons, 1.5px stroke). Consistent 18–20px in UI, 24px in nav.
- No illustrations in core flows. One simple line-style spot illustration is allowed per empty state, monochrome `--color-gray-300`.
- No stock photos. No gradients except none — this is a flat, calm system. (The only near-gradient permitted is a subtle `--color-primary-50` wash behind the dashboard greeting, optional.)

---

## 5. Accessibility floor (non-negotiable)

- Contrast: all text ≥ 4.5:1, large text ≥ 3:1. The token pairings above already satisfy this.
- Every interactive element has a visible keyboard focus ring.
- Hit targets ≥ 44×44px on touch.
- Forms: every input has a programmatically associated label.
- Color is never the only signal — "Paid" always has the word, not just green.
- `prefers-reduced-motion` honored.
- Screen-reader live region announces toasts and async results.

---

## 6. Voice & Copy

- Sentence case. Plain verbs. No filler.
- Name things by what the user controls: "Record sale", not "Create transaction record".
- Buttons say what happens: "Send receipt", "Add customer", "Record payment".
- An action keeps its name through the whole flow: button "Send receipt" → toast "Receipt sent".
- Errors are specific and fixable, in the interface's voice, never apologetic: "This phone number is already on a customer" not "Oops! Something went wrong."
- Currency always formatted ₦ with thousands separators and 2 decimals where relevant: ₦2,480,000.00.

---

## 7. What "done" looks like for any screen

A screen is not finished until it has all of:
1. Loading state (skeleton, not a spinner-on-blank where avoidable)
2. Empty state
3. Error state
4. Populated/normal state
5. Mobile layout verified (tables → cards, modals → sheets)
6. Keyboard focus order correct, focus rings visible
7. All money values colored by rule and tabular-aligned
8. No hardcoded colors/spacing — tokens only

---

## 8. Tailwind mapping (implementation note for Claude Code)

Map every token above into `tailwind.config.ts` `theme.extend` so utilities read from the CSS variables (e.g. `colors.primary.600 = 'var(--color-primary-600)'`). Components use Tailwind utilities that resolve to these variables — never raw hex in className. This keeps one source of truth and makes a future dark mode a variable swap, not a refactor.
