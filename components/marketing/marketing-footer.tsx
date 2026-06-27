import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { FOOTER_COLUMNS } from "./brand";

/**
 * Public site footer — shared across the landing + every marketing sub-page.
 * Columns (Legal / Support / Community) now point to real pages.
 */
export function MarketingFooter() {
  return (
    <footer className="border-t border-white/5 bg-[#070510] py-14">
      <div className="mx-auto flex max-w-content flex-col justify-between gap-10 px-4 sm:px-6 md:flex-row">
        <div>
          <Link href="/" className="flex items-center gap-2" aria-label="TrustOps AI home">
            <LogoMark size={28} />
            <span className="font-display text-[19px] font-[600] text-white">TrustOps AI</span>
          </Link>
          <p className="mt-4 max-w-xs text-small text-white/40">
            © {new Date().getFullYear()} TrustOps AI. Empowering African SMEs.
          </p>
        </div>
        <nav className="flex flex-col gap-8 md:flex-row md:gap-12" aria-label="Footer">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <span className="text-caption uppercase tracking-[0.05em] text-fuchsia-300/80">
                {col.title}
              </span>
              {col.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-small text-white/45 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </div>
    </footer>
  );
}
