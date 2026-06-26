import { LogoMark } from "@/components/brand/logo";

/**
 * Auth layout — a centered glass split card floating on the near-black canvas
 * shared with the marketing landing. Left: a gradient promo panel with soft
 * glows + brand promise (desktop only). Right: the form (login / signup /
 * accept-invite), passed as children. The indigo→violet→fuchsia gradient and
 * editorial serif headline keep auth visually continuous with the landing page.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0712] px-4 py-10">
      {/* Ambient gradient glows — same lighting language as the hero */}
      <div className="pointer-events-none absolute left-1/2 top-[-10%] h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-violet-600/25 blur-[120px]" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-40 top-40 h-[28rem] w-[28rem] rounded-full bg-indigo-600/20 blur-[120px]" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-44 -right-32 h-[30rem] w-[30rem] rounded-full bg-fuchsia-600/20 blur-[120px]" aria-hidden="true" />

      <div className="relative grid w-full max-w-[940px] overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur-xl lg:grid-cols-2">
        {/* Decorative gradient panel (desktop) */}
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 lg:block">
          <AuthBlobs />
          <div className="relative z-10 flex h-full flex-col justify-between p-10 text-white">
            <div className="flex items-center gap-2.5">
              <LogoMark size={34} />
              <span className="font-display text-[22px] font-[600] text-white">TrustOps</span>
            </div>
            <div>
              <h2 className="font-display text-[32px] font-[600] leading-[1.1] tracking-[-0.02em]">
                Run your business with{" "}
                <span className="italic">confidence.</span>
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
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <LogoMark size={28} />
            <span className="font-display text-[20px] font-[600] text-text-primary">TrustOps</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Soft overlapping glows + a ring that echo the landing's decorative cluster. */
function AuthBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <span className="absolute -left-16 top-8 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
      <span className="absolute left-16 top-28 h-44 w-44 rounded-full bg-white/10 blur-xl" />
      <span className="absolute -left-8 bottom-4 h-48 w-48 rounded-full bg-fuchsia-300/30 blur-2xl" />
      <span className="absolute -bottom-10 left-28 h-40 w-40 rounded-full bg-white/10 blur-xl" />
      <span className="absolute right-10 top-10 h-24 w-24 rounded-full border-2 border-white/20" />
    </div>
  );
}
