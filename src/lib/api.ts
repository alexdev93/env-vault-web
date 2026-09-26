// Same-origin API client. In production the Worker serves this UI, and in dev
// Vite proxies /api/* to `wrangler dev`, so a relative path works in both.

// The list carries names and metadata only. Values are fetched one at a time
// with api.getValue(), per reveal or copy, and dropped again on hide.
export interface Var {
  key: string;
  type: "var";
  notes: string;
  updated_at: string;
  projects: string[];
  shared: boolean;
}

/** Where one of a project's pieces lives: database on Neon, hosting on Cloudflare, ... */
export interface Service {
  id: string;
  project_id: string;
  kind: string;
  provider: string;
  url: string;
  account: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type ServiceInput = Pick<Service, "kind" | "provider" | "url" | "account" | "notes">;

export interface Branch {
  id: string;
  project_id: string;
  name: string;
  notes: string;
  updated_at: string;
}

/** A branch's own variable. `overrides` is true when the project has a default with the same key. */
export interface BranchVar {
  key: string;
  notes: string;
  updated_at: string;
  overrides: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  notes: string;
  repo_url: string;
  site_url: string;
  created_at: string;
  updated_at: string;
  keys: string[];
  services: Service[];
  branches: Branch[];
}

export type ProjectDetail = Omit<Project, "branches"> & { branches: (Branch & { vars: BranchVar[] })[] };

export type ProjectInput = Pick<Project, "name" | "description" | "notes" | "repo_url" | "site_url">;

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

const enc = encodeURIComponent;
const varPath = (key: string) => `/api/vars/${enc(key)}`;
const branchVarPath = (branchId: string, key: string) => `/api/branches/${enc(branchId)}/vars/${enc(key)}`;
const send = <T = { ok: true },>(method: string, path: string, body?: unknown) =>
  request<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  whoami: () => request<{ ok: true }>("/api/whoami"),
  logout: () => request<{ ok: true }>("/api/logout", { method: "POST" }),
  token: () => request<{ token: string; url: string }>("/api/token"),
  listVars: () => request<Var[]>("/api/vars"),
  getValue: async (key: string) => (await request<{ value: string }>(`${varPath(key)}/value`, { cache: "no-store" })).value,
  saveVar: (key: string, value: string, projects: string[], notes: string) =>
    send<{ ok: true; key: string }>("POST", "/api/vars", { key, value, projects, notes }),
  /** Partial edit; a different `key` renames the variable. */
  updateVar: (key: string, changes: { key?: string; value?: string; notes?: string; projects?: string[] }) =>
    send<{ ok: true; key: string }>("PATCH", varPath(key), changes),
  deleteVar: (key: string) => send("DELETE", varPath(key)),

  listProjects: () => request<Project[]>("/api/projects"),
  getProject: (ref: string) => request<ProjectDetail>(`/api/projects/${enc(ref)}`),
  createProject: (input: ProjectInput & { services?: ServiceInput[]; branches?: string[] }) =>
    send<{ ok: true; id: string; name: string }>("POST", "/api/projects", input),
  updateProject: (id: string, changes: Partial<ProjectInput>) =>
    send<{ ok: true; id: string; name: string }>("PATCH", `/api/projects/${enc(id)}`, changes),
  deleteProject: (id: string) => send("DELETE", `/api/projects/${enc(id)}`),

  addService: (projectId: string, input: ServiceInput) =>
    send<{ ok: true; id: string }>("POST", `/api/projects/${enc(projectId)}/services`, input),
  updateService: (id: string, changes: Partial<ServiceInput>) => send("PATCH", `/api/services/${enc(id)}`, changes),
  deleteService: (id: string) => send("DELETE", `/api/services/${enc(id)}`),

  addBranch: (projectId: string, name: string, notes: string) =>
    send<{ ok: true; id: string; name: string }>("POST", `/api/projects/${enc(projectId)}/branches`, { name, notes }),
  updateBranch: (id: string, changes: { name?: string; notes?: string }) => send("PATCH", `/api/branches/${enc(id)}`, changes),
  deleteBranch: (id: string) => send("DELETE", `/api/branches/${enc(id)}`),

  getBranchValue: async (branchId: string, key: string) =>
    (await request<{ value: string }>(`${branchVarPath(branchId, key)}/value`, { cache: "no-store" })).value,
  saveBranchVar: (branchId: string, input: { key: string; value?: string; notes?: string }) =>
    send<{ ok: true; key: string }>("POST", `/api/branches/${enc(branchId)}/vars`, input),
  updateBranchVar: (branchId: string, key: string, changes: { key?: string; value?: string; notes?: string }) =>
    send<{ ok: true; key: string }>("PATCH", branchVarPath(branchId, key), changes),
  deleteBranchVar: (branchId: string, key: string) => send("DELETE", branchVarPath(branchId, key)),
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
