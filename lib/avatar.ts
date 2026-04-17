const PALETTE = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function initialsFor(username: string): string {
  const clean = username.replace(/[^a-zA-Z0-9]/g, "");
  if (clean.length === 0) return "?";
  return clean.slice(0, 2).toUpperCase();
}

export function colorFor(username: string): string {
  return PALETTE[hashString(username) % PALETTE.length];
}
