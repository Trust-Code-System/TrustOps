import { LogoMark } from "@/components/brand/logo";

/**
 * Auth layout — a centered split card floating on a vibrant brand gradient.
 * Left: a decorative gradient panel with soft blobs + brand promise (desktop
 * only). Right: the form (login / signup / accept-invite), passed as children.
 * The gradient is built from the brand `primary` token warmed toward Tailwind's
 * violet/fuchsia — a scoped, decorative auth treatment (no product tokens leak).
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-primary-600 via-violet-600 to-fuchsia-500 px-4 py-10">
      {/* Ambient glows behind the card */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-white/15 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-44 -right-32 h-[30rem] w-[30rem] rounded-full bg-fuchsia-300/25 blur-3xl" aria-hidden="true" />

      <div className="relative grid w-full max-w-[940px] overflow-hidden rounded-[24px] bg-surface-card shadow-2xl lg:grid-cols-2">
        {/* Decorative panel (desktop) */}
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary-600 via-violet-600 to-fuchsia-500 lg:block">
          <AuthBlobs />
          <div className="relative z-10 flex h-full flex-col justify-between p-10 text-white">
            <div className="flex items-center gap-2">
              <LogoMark size={34} />
              <span className="text-h2 font-[700] text-white">TrustOps</span>
            </div>
            <div>
              <h2 className="text-[30px] font-[800] leading-[1.1] tracking-[-0.02em]">
                Run your business with confidence.
              </h2>
              <p className="mt-4 max-w-xs text-[15px] leading-[24px] text-white/85">
                Inventory, sales, and AI-powered insights — one secure operating
                system for your SME.
              </p>
            </div>
          </div>
        </div>

        {/* Form panel */}
        <div className="px-6 py-10 sm:px-12">
          {/* Brand on mobile (the decorative panel is hidden there) */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <LogoMark size={28} />
            <span className="text-h2 font-[700] text-primary-700">TrustOps</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Soft overlapping blobs that echo the reference's decorative cluster. */
function AuthBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <span className="absolute -left-16 top-8 h-56 w-56 rounded-full bg-white/15" />
      <span className="absolute left-16 top-28 h-44 w-44 rounded-full bg-white/10" />
      <span className="absolute -left-8 bottom-4 h-48 w-48 rounded-full bg-fuchsia-300/30" />
      <span className="absolute -bottom-10 left-28 h-40 w-40 rounded-full bg-white/10" />
      <span className="absolute right-10 top-10 h-24 w-24 rounded-full border-2 border-white/20" />
    </div>
  );
}
