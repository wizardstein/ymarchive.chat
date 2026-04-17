const DAY_MS = 86_400_000;

export function formatTime(unix: number): string {
  const d = new Date(unix * 1000);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function formatDateDivider(unix: number): string {
  const d = new Date(unix * 1000);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateRange(firstUnix: number, lastUnix: number): string {
  if (!firstUnix || !lastUnix) return "";
  const first = new Date(firstUnix * 1000);
  const last = new Date(lastUnix * 1000);
  const sameYear = first.getFullYear() === last.getFullYear();
  const fmt = (d: Date, includeYear: boolean) =>
    d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: includeYear ? "numeric" : undefined,
    });
  return `${fmt(first, !sameYear)} – ${fmt(last, true)}`;
}

export function startOfDayLocalUnix(unix: number): number {
  const d = new Date(unix * 1000);
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

export function dateToUnixStartOfDay(iso: string): number | null {
  if (!iso) return null;
  const [y, m, day] = iso.split("-").map(Number);
  if (!y || !m || !day) return null;
  const d = new Date(y, m - 1, day, 0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

export function dateToUnixEndOfDay(iso: string): number | null {
  const start = dateToUnixStartOfDay(iso);
  if (start == null) return null;
  return start + Math.floor(DAY_MS / 1000) - 1;
}
