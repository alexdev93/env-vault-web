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
  /** The resource at the provider: the Neon project, the Cloudflare Worker… */
  name: string;
  url: string;
  account: string;
  region: string;
  plan: string;
  notes: string;
  /** Variables this service provides (DATABASE_URL comes from Neon). */
  var_keys: string[];
  created_at: string;
  updated_at: string;
}

export type ServiceInput = Pick<Service, "kind" | "provider" | "name" | "url" | "account" | "region" | "plan" | "notes" | "var_keys">;

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

export type ProjectStatus = "" | "idea" | "building" | "live" | "maintenance" | "archived";

export interface ProjectDetailField {
  label: string;
  value: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  notes: string;
  repo_url: string;
  site_url: string;
  status: ProjectStatus;
  stack: string;
  /** Free-form extra facts: "Deploy command" → "npm run deploy". */
  details: ProjectDetailField[];
  created_at: string;
  updated_at: string;
  keys: string[];
  services: Service[];
  branches: Branch[];
}

export type ProjectDetail = Omit<Project, "branches"> & { branches: (Branch & { vars: BranchVar[] })[] };

export type ProjectInput = Pick<Project, "name" | "description" | "notes" | "repo_url" | "site_url" | "status" | "stack" | "details">;

export type ItemType = "login" | "note" | "secret";

/** A personal vault item that isn't an environment variable. The value (password, note, secret) is fetched separately. */
export interface Item {
  id: string;
  type: ItemType;
  title: string;
  url: string;
  username: string;
  notes: string;
  project_id: string | null;
  project: string | null;
  created_at: string;
  updated_at: string;
}

export type ItemInput = Pick<Item, "title" | "url" | "username" | "notes" | "project_id"> & { type?: ItemType; value?: string };

/** One replaced value. Values are fetched one at a time, like everything else. */
export interface HistoryEntry {
  id: number;
  created_at: string;
}

export type AccessKind = "env_pull" | "value_read" | "token_read" | "write" | "login" | "login_failed" | "auth_failed" | "api_read";

/** One access-log row: who pulled, read or changed what, from where. Never holds a secret. */
export interface AccessEvent {
  id: number;
  at: string;
  kind: AccessKind;
  method: string;
  path: string;
  status: number;
  auth: "bearer" | "session" | "none";
  project: string;
  branch: string;
  target: string;
  vars_count: number | null;
  /** The caller's best name: its ENV_VAULT_CLIENT, else hostname, else IP. */
  who: string;
  client: string;
  host: string;
  ci: string;
  command: string;
  ip: string;
  country: string;
  city: string;
  as_org: string;
  colo: string;
  user_agent: string;
}

export interface ActivitySummary {
  days: number;
  from: string;
  project: string;
  totals: { pulls: number; pulls_24h: number; reads: number; writes: number; failures: number; clients: number };
  daily: { day: string; pulls: number }[];
  projects: {
    project: string;
    last_at: string;
    last_client: string;
    last_ip: string;
    last_country: string;
    last_ci: string;
    last_branch: string;
    last_status: number;
    pulls: number;
    pulls_24h: number;
    clients: number;
    daily: { day: string; pulls: number }[];
  }[];
  clients: {
    client: string;
    last_at: string;
    host: string;
    ci: string;
    ip: string;
    country: string;
    city: string;
    as_org: string;
    user_agent: string;
    requests: number;
    pulls: number;
    projects: string[];
  }[];
}

export interface ActivityQuery {
  project?: string;
  kind?: AccessKind[];
  client?: string;
  before?: number;
  limit?: number;
}

/** What a history belongs to: a variable, one branch's value, or a personal item. */
export const owners = {
  var: (key: string) => `var:${key}`,
  branch: (branchId: string, key: string) => `branch:${branchId}:${key}`,
  item: (id: string) => `item:${id}`,
};

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

  listItems: () => request<Item[]>("/api/items"),
  getItemValue: async (id: string) => (await request<{ value: string }>(`/api/items/${enc(id)}/value`, { cache: "no-store" })).value,
  createItem: (input: ItemInput & { type: ItemType; value: string }) => send<{ ok: true; id: string }>("POST", "/api/items", input),
  updateItem: (id: string, changes: Partial<ItemInput>) => send<{ ok: true; id: string }>("PATCH", `/api/items/${enc(id)}`, changes),
  deleteItem: (id: string) => send("DELETE", `/api/items/${enc(id)}`),

  activitySummary: (days: number, project = "") =>
    request<ActivitySummary>(`/api/activity/summary?days=${days}&project=${enc(project)}`, { cache: "no-store" }),
  activity: (q: ActivityQuery = {}) => {
    const params = new URLSearchParams();
    if (q.project) params.set("project", q.project);
    if (q.kind?.length) params.set("kind", q.kind.join(","));
    if (q.client) params.set("client", q.client);
    if (q.before) params.set("before", String(q.before));
    params.set("limit", String(q.limit ?? 50));
    return request<{ events: AccessEvent[]; next: number | null }>(`/api/activity?${params}`, { cache: "no-store" });
  },

  history: (owner: string) => request<HistoryEntry[]>(`/api/history?owner=${enc(owner)}`, { cache: "no-store" }),
  getHistoryValue: async (id: number) => (await request<{ value: string }>(`/api/history/${id}/value`, { cache: "no-store" })).value,
  restoreHistory: (id: number) => send<{ ok: true; owner: string }>("POST", `/api/history/${id}/restore`, {}),
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
