"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Customer-facing pay control on the public invoice page.
 *  - real gateway → link straight to the hosted checkout (authorization_url)
 *  - simulated     → demo "Pay now" that reconciles via /api/payments/simulate
 */
export function PayButton({
  reference,
  provider,
  authorizationUrl,
  balance,
}: {
  reference: string;
  provider: string;
  authorizationUrl: string | null;
  balance: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (balance <= 0) return null;

  async function simulate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) {
        setError(json.error ?? "Payment failed. Please try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (provider !== "simulated") {
    return authorizationUrl ? (
      <a
        href={authorizationUrl}
        className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary-600 px-6 text-body-strong text-white hover:bg-primary-700"
      >
        Pay now
      </a>
    ) : (
      <p className="text-small text-text-muted">Payment link is being prepared — check back shortly.</p>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={simulate}
        disabled={busy}
        className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary-600 px-6 text-body-strong text-white hover:bg-primary-700 disabled:opacity-60"
      >
        {busy ? "Processing…" : "Pay now (demo)"}
      </button>
      {error && <p className="text-small text-danger-700">{error}</p>}
      <p className="text-center text-small text-text-muted">
        Demo mode — no real gateway is connected.
      </p>
    </div>
  );
}
