// Tiny session blob saved in localStorage so /viewer can auto-restore the
// user's last archive view without re-uploading. The heavy data (decoded
// profiles) lives in IndexedDB via lib/cache.ts; here we only store the
// fingerprint and the current navigation spot.

const KEY = "ym-last-session-v1";

export interface LastSession {
  fingerprint: string;
  label: string;
  profileCount: number;
  pickedIdx: number | null;
  activePeer: string | null;
  savedAt: number;
}

export function readSession(): LastSession | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastSession;
    if (!parsed || typeof parsed.fingerprint !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(s: LastSession): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // quota errors etc. — best effort
  }
}

export function clearSession(): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function sessionLabel(profiles: Array<{ username: string }>): string {
  if (profiles.length === 0) return "";
  if (profiles.length === 1) return profiles[0].username;
  return `${profiles[0].username} + ${profiles.length - 1} other${profiles.length - 1 === 1 ? "" : "s"}`;
}
