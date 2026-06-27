import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { getPublicCatalog, type CatalogProduct } from "@/modules/storefront/public";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { token: string };
}): Promise<Metadata> {
  const catalog = await getPublicCatalog(params.token);
  return { title: catalog ? `${catalog.company_name} · Catalog` : "Catalog" };
}

function naira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG")}`;
}

export default async function StorefrontPage({
  params,
}: {
  params: { token: string };
}) {
  const catalog = await getPublicCatalog(params.token);
  if (!catalog) notFound();

  // Group products by category for a tidy menu.
  const groups = new Map<string, CatalogProduct[]>();
  for (const p of catalog.products) {
    const key = p.category?.trim() || "All products";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  const waDigits = catalog.whatsapp?.replace(/\D/g, "") ?? "";
  const waHref = waDigits
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(`Hi ${catalog.company_name}, I'd like to place an order.`)}`
    : null;

  return (
    <main className="mx-auto max-w-lg px-4 py-8 sm:py-12">
      <header className="text-center">
        <h1 className="text-display">{catalog.company_name}</h1>
        <p className="mt-1 text-body text-text-secondary">Catalog</p>
      </header>

      {catalog.products.length === 0 ? (
        <p className="mt-10 text-center text-body text-text-muted">
          No products are listed yet. Check back soon.
        </p>
      ) : (
        <div className="mt-8 space-y-8">
          {[...groups.entries()].map(([category, items]) => (
            <section key={category}>
              <h2 className="mb-2 text-caption font-[600] uppercase tracking-[0.04em] text-text-muted">
                {category}
              </h2>
              <ul className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface-card">
                {items.map((p, i) => (
                  <li key={i} className="flex items-center justify-between gap-4 p-4">
                    <span className="text-body text-text-primary">
                      {p.name}
                      {p.unit && p.unit !== "piece" ? (
                        <span className="text-text-muted"> / {p.unit}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 tabular text-body-strong">{naira(p.sell_price)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {waHref && (
        <div className="sticky bottom-4 mt-10">
          <a
            href={waHref}
            target="_blank"
            rel="noopener"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-success-500 px-6 text-body-strong text-white shadow-lg hover:opacity-90"
          >
            <MessageCircle className="h-5 w-5" /> Order on WhatsApp
          </a>
        </div>
      )}

      <p className="mt-10 text-center text-small text-text-muted">Powered by TrustOps</p>
    </main>
  );
}
