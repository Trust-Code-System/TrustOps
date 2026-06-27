import { Reveal } from "./motion";
import { GLASS_CARD } from "./brand";
import { cn } from "@/lib/utils";

/**
 * Renders a long-form legal document (Privacy Policy, Terms of Service) in the
 * marketing dark theme with a readable measure and a sticky-feeling table of
 * contents. Content is passed in as structured sections.
 */
export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export function LegalDoc({
  updated,
  intro,
  sections,
}: {
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <div className="mx-auto max-w-content px-4 py-16 sm:px-6 sm:py-20">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[220px_1fr]">
        {/* Table of contents */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <p className="mb-3 text-caption uppercase tracking-[0.1em] text-fuchsia-300/80">On this page</p>
            <nav className="flex flex-col gap-2">
              {sections.map((s, i) => (
                <a
                  key={s.heading}
                  href={`#section-${i + 1}`}
                  className="text-small text-white/45 transition-colors hover:text-white"
                >
                  {s.heading}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Body */}
        <div>
          <Reveal>
            <p className="text-caption uppercase tracking-[0.08em] text-white/40">Last updated · {updated}</p>
            <p className="mt-4 text-body leading-relaxed text-white/65">{intro}</p>
          </Reveal>

          <div className="mt-10 flex flex-col gap-8">
            {sections.map((s, i) => (
              <Reveal key={s.heading}>
                <section id={`section-${i + 1}`} className={cn(GLASS_CARD, "scroll-mt-24 p-7 sm:p-8")}>
                  <h2 className="text-h2 text-white">
                    <span className="mr-2 text-fuchsia-300/70">{i + 1}.</span>
                    {s.heading}
                  </h2>
                  {s.paragraphs?.map((p, j) => (
                    <p key={j} className="mt-3 text-body leading-relaxed text-white/60">
                      {p}
                    </p>
                  ))}
                  {s.bullets && (
                    <ul className="mt-4 flex flex-col gap-2.5">
                      {s.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-3 text-body text-white/60">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-400" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
