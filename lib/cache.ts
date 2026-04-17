// IndexedDB-backed cache for fully parsed archives. Keyed by a fingerprint
// of the input files so re-opening the same archive is instant.

import type { YMProfile } from "./types";

const DB_NAME = "ym-archive-viewer";
const STORE = "results";
const DB_VERSION = 1;

// Bump if the YMProfile schema changes — invalidates prior cache entries.
const SCHEMA_VERSION = 1;

interface StoredResult {
  schemaVersion: number;
  createdAt: number;
  profiles: YMProfile[];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheGet(key: string): Promise<YMProfile[] | null> {
  try {
    const db = await openDb();
    const stored = await new Promise<StoredResult | undefined>(
      (resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const store = tx.objectStore(STORE);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result as StoredResult | undefined);
        req.onerror = () => reject(req.error);
      },
    );
    db.close();
    if (!stored) return null;
    if (stored.schemaVersion !== SCHEMA_VERSION) return null;
    return stored.profiles;
  } catch {
    return null;
  }
}

export async function cachePut(
  key: string,
  profiles: YMProfile[],
): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const value: StoredResult = {
        schemaVersion: SCHEMA_VERSION,
        createdAt: Date.now(),
        profiles,
      };
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Best-effort; quota errors or structured-clone failures are non-fatal.
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore
  }
}
