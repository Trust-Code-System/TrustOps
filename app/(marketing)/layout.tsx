import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

/**
 * Shared chrome for every public marketing sub-page (Solutions, Pricing, Legal,
 * Support, Community…). The landing page ("/") lives outside this group and
 * embeds its own nav inside the hero, so it isn't double-wrapped here.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[#0a0712] text-white">
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
