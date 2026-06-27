import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline · TrustOps" };

/** Generic offline fallback served by the service worker when navigation fails. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-display">You&apos;re offline</h1>
      <p className="max-w-md text-body text-text-secondary">
        TrustOps can&apos;t reach the network right now. Any sale you record will be saved on
        this device and synced automatically once you&apos;re back online.
      </p>
      <p className="text-small text-text-muted">Reconnect and this page will refresh.</p>
    </main>
  );
}
