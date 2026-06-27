"use client";

import type { RecordSaleInput } from "@/modules/sales/schemas";

/**
 * Offline sale queue (IndexedDB, no dependencies).
 *
 * When a sale is recorded with no connectivity (or the network drops mid-submit)
 * it is stored here and replayed by the PWA registrar when the device comes back
 * online. Each queued sale carries a `clientUuid`, so the server's record_sale
 * is idempotent on replay — a flaky retry can never create a duplicate invoice.
 */

const DB_NAME = "trustops-offline";
const STORE = "sales";

export interface QueuedSale {
  id: string;
  input: RecordSaleInput;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export async function enqueueSale(input: RecordSaleInput): Promise<void> {
  const item: QueuedSale = {
    id: input.clientUuid ?? crypto.randomUUID(),
    input,
    createdAt: Date.now(),
  };
  await tx("readwrite", (s) => s.put(item));
}

export async function allSales(): Promise<QueuedSale[]> {
  const rows = await tx<QueuedSale[]>("readonly", (s) => s.getAll() as IDBRequest<QueuedSale[]>);
  return rows.sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeSale(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id) as unknown as IDBRequest<undefined>);
}

export async function countSales(): Promise<number> {
  try {
    return await tx<number>("readonly", (s) => s.count());
  } catch {
    return 0;
  }
}
