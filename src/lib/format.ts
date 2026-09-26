// "2h", "3d", "1w", "7mo": the compact age used in list rows.
export function shortAge(iso: string, now = Date.now()): string {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d`;
  if (s < 30 * 86400) return `${Math.floor(s / (7 * 86400))}w`;
  if (s < 365 * 86400) return `${Math.floor(s / (30 * 86400))}mo`;
  return `${Math.floor(s / (365 * 86400))}y`;
}

export function longDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

// Projects have no stored colour yet (Phase 2 adds one), so pick a stable one from the name.
// ANSI-style swatches that read on both the paper and the dark theme.
const PROJECT_COLORS = ["#3ddc84", "#f5c451", "#5ec8f2", "#c792ea", "#ff8a65", "#8ea58e"];
export function projectColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PROJECT_COLORS[h % PROJECT_COLORS.length];
}

export const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
