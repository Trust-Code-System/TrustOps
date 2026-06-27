"use client";

import { useEffect } from "react";
import { recordSale } from "@/modules/sales/actions";
import { allSales, removeSale } from "@/lib/offline/sale-queue";
import { useToast } from "@/components/ui/toast";

/**
 * Registers the service worker (offline app shell) and flushes the offline sale
 * queue when the device is online — on mount and on every 'online' event.
 * Replays are idempotent (clientUuid), so a double-flush can't duplicate a sale.
 * Mounted inside the authenticated layout so the sync runs with a live session.
 */
export function PWARegister() {
  const { toast } = useToast();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* SW registration is best-effort */
      });
    }

    let syncing = false;
    async function flush() {
      if (syncing || !navigator.onLine) return;
      syncing = true;
      try {
        const queued = await allSales();
        let synced = 0;
        for (const q of queued) {
          const res = await recordSale(q.input);
          // Only drop on success — a transient error keeps the sale for retry.
          // Idempotency (clientUuid) makes the eventual retry safe.
          if (res.ok) {
            await removeSale(q.id);
            synced++;
          }
        }
        if (synced > 0) {
          toast(`${synced} offline sale${synced > 1 ? "s" : ""} synced`, "success");
        }
      } finally {
        syncing = false;
      }
    }

    void flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [toast]);

  return null;
}
