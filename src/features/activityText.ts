import type { AccessEvent, AccessKind } from "../lib/api";

export const KIND_CODES: Record<AccessKind, string> = {
  env_pull: "PULL",
  value_read: "READ",
  token_read: "TOKEN",
  write: "WRITE",
  login: "LOGIN",
  login_failed: "FAIL",
  auth_failed: "FAIL",
  api_read: "API",
};

/** Filter groups for the event log. */
export const KIND_GROUPS: [string, string, AccessKind[]][] = [
  ["all", "All", []],
  ["pulls", "Pulls", ["env_pull"]],
  ["reads", "Secret reads", ["value_read", "token_read"]],
  ["writes", "Changes", ["write"]],
  ["auth", "Sign-ins & failures", ["login", "login_failed", "auth_failed"]],
];

/** "cheat-sheet-prod", or "dashboard" for your own browser session. */
export function whoOf(e: Pick<AccessEvent, "who" | "auth">): string {
  if (e.auth === "session") return "you (dashboard)";
  return e.who || "unknown";
}

/** Where a request came from: "196.188.1.2 · ET · Ethio Telecom". */
export function whereOf(e: Pick<AccessEvent, "ip" | "country" | "as_org">): string {
  return [e.ip, e.country, e.as_org].filter(Boolean).join(" · ");
}

/** One line saying what happened. */
export function describe(e: AccessEvent): string {
  const b = e.branch ? ` -b ${e.branch}` : "";
  switch (e.kind) {
    case "env_pull":
      return e.status === 200
        ? `Pulled ${e.project}${b}${e.vars_count !== null ? ` · ${e.vars_count} variables` : ""}`
        : `Tried to pull ${e.project}${b} (HTTP ${e.status})`;
    case "value_read":
      return `Read ${e.target}${e.branch ? ` on ${e.branch}` : ""}${e.project ? ` (${e.project})` : ""}`;
    case "token_read":
      return "Viewed the API token";
    case "write":
      return `Changed: ${e.target}${e.status >= 400 ? ` (HTTP ${e.status})` : ""}`;
    case "login":
      return "Signed in to the dashboard";
    case "login_failed":
      return "Wrong dashboard password";
    case "auth_failed":
      return `Rejected ${e.method} ${e.path}: bad or missing token`;
    case "api_read":
      return `API ${e.method} ${e.path}${e.project ? ` (${e.project})` : ""}`;
  }
}

export type Pulse = "active" | "quiet" | "silent";

/** Heartbeat: pulled in the last 24h, in the last 7 days, or not since. */
export function pulseOf(lastAt: string | null | undefined, now = Date.now()): Pulse {
  if (!lastAt) return "silent";
  const age = now - new Date(lastAt).getTime();
  if (age < 86400000) return "active";
  if (age < 7 * 86400000) return "quiet";
  return "silent";
}

export const PULSE_LABEL: Record<Pulse, { mark: string; label: string; hint: string }> = {
  active: { mark: "●", label: "Active", hint: "Pulled in the last 24 hours" },
  quiet: { mark: "◐", label: "Quiet", hint: "Last pulled 1–7 days ago" },
  silent: { mark: "○", label: "Silent", hint: "No pulls in 7 days" },
};
