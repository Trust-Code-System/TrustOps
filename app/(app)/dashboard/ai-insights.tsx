import Link from "next/link";
import { Orbit, ArrowRight } from "lucide-react";
import { listInsights } from "@/modules/ai/queries";

/**
 * AI Smart Insight — the dashboard's hero intelligence card (Stitch widget).
 * A single gradient indigo panel surfacing the top rule-based insight, grounded
 * in the user's own data, linking through to the assistant for the full picture.
 */
export async function AiInsights() {
  const insights = await listInsights();
  if (insights.length === 0) return null;

  const top = insights[0];

  return (
    <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary-600 to-primary-800 p-6 shadow-lg">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

      <div className="relative flex items-center gap-2">
        <Orbit className="h-5 w-5 text-white" aria-hidden="true" />
        <h3 className="text-h3 font-[600] text-white">AI Smart Insight</h3>
      </div>

      <p className="relative mt-4 text-body leading-relaxed text-white/90">
        <span className="font-[600] text-white">{top.title}.</span> {top.body}
      </p>

      <Link
        href="/assistant"
        className="relative mt-6 inline-flex w-max items-center gap-2 rounded-md bg-success-500 px-4 py-2 text-small font-[600] text-white transition-colors hover:bg-success-700"
      >
        View Suggestions
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
