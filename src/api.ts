// Same-origin API client. In production the Worker serves this UI, and in dev
// Vite proxies /api/* to `wrangler dev`, so a relative path works in both.

export interface Var {
  key: string;
  value: string;
  updated_at: string;
  projects: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  keys: string[];
}

export class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
  }
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  if (res.status === 401) throw new UnauthorizedError();
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "request failed");
  return data as T;
}

export const api = {
  whoami: () => request<{ ok: true }>("/api/whoami"),
  logout: () => request<{ ok: true }>("/api/logout", { method: "POST" }),
  token: () => request<{ token: string; url: string }>("/api/token"),
  listVars: () => request<Var[]>("/api/vars"),
  saveVar: (key: string, value: string, projects: string[]) =>
    request<{ ok: true; key: string }>("/api/vars", {
      method: "POST",
      body: JSON.stringify({ key, value, projects }),
    }),
  deleteVar: (key: string) =>
    request<{ ok: true }>(`/api/vars/${encodeURIComponent(key)}`, { method: "DELETE" }),
  listProjects: () => request<Project[]>("/api/projects"),
  createProject: (name: string, description: string) =>
    request<{ ok: true; id: string; name: string }>("/api/projects", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    }),
};

// Login is special-cased: a 401 here means "wrong password", not "session expired".
export async function login(password: string): Promise<void> {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "login failed");
}
