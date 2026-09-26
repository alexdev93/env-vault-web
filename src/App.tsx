import { useCallback, useEffect, useRef, useState } from "react";
import { api, UnauthorizedError, type Project, type Var } from "./api";
import { Icon } from "./icons";
import { copyText, useToast } from "./toast";
import { Login } from "./components/Login";
import { ProjectModal } from "./components/ProjectModal";
import { UsageModal } from "./components/UsageModal";
import { VarModal } from "./components/VarModal";
import { VarRow } from "./components/VarRow";

const ALL = "__all__";
const SHARED = "__shared__";

type Status = "booting" | "login" | "app";
type OpenModal = { kind: "var"; editing: Var | null } | { kind: "project" } | { kind: "usage" } | null;

function matches(v: Var, activeProject: string, query: string) {
  if (activeProject === SHARED && v.projects.length < 2) return false;
  if (activeProject !== ALL && activeProject !== SHARED && !v.projects.includes(activeProject)) return false;
  if (!query) return true;
  const q = query.toLowerCase();
  return v.key.toLowerCase().includes(q) || v.value.toLowerCase().includes(q) || v.projects.some((p) => p.toLowerCase().includes(q));
}

export function App() {
  const toast = useToast();
  const [status, setStatus] = useState<Status>("booting");
  const [vars, setVars] = useState<Var[] | null>(null); // null = still loading (skeleton)
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState(ALL);
  const [query, setQuery] = useState("");
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<OpenModal>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Runs an API action: a 401 drops back to the login screen, any other failure
  // shows an error toast instead of failing silently.
  const guard = useCallback(
    async (fn: () => Promise<void>) => {
      try {
        await fn();
      } catch (e) {
        if (e instanceof UnauthorizedError) setStatus("login");
        else toast((e as Error).message, true);
      }
    },
    [toast],
  );

  const refreshAll = useCallback(async () => {
    await guard(async () => {
      try {
        const [v, p] = await Promise.all([api.listVars(), api.listProjects()]);
        setVars(v);
        setProjects(p);
      } finally {
        setVars((v) => v ?? []); // never leave the skeleton up after a failed load
      }
    });
  }, [guard]);

  const enterApp = useCallback(async () => {
    setVars(null);
    setStatus("app");
    await refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    api.whoami().then(enterApp, () => setStatus("login"));
  }, [enterApp]);

  // "/" focuses search (unless typing in a field)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const closeModal = useCallback(() => setModal(null), []);

  if (status === "booting") return null;
  if (status === "login") return <Login onLoggedIn={enterApp} />;

  const logout = () =>
    guard(async () => {
      await api.logout();
      setStatus("login");
    });

  const toggleReveal = (key: string) =>
    setRevealed((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const copyValue = (v: Var) => copyText(v.value, `Copied ${v.key}`, toast);

  const deleteVar = (key: string) =>
    guard(async () => {
      if (!confirm(`Delete ${key}? This can't be undone.`)) return;
      await api.deleteVar(key);
      toast(`Deleted ${key}`);
      await refreshAll();
    });

  const q = query.trim();
  const shown = (vars ?? []).filter((v) => matches(v, activeProject, q));
  const chips: [string, string][] = [["All", ALL], ["Shared", SHARED], ...projects.map((p): [string, string] => [p.name, p.name])];

  return (
    <div id="app">
      <header id="topbar">
        <div className="bar-inner">
          <div className="brand brand-text">
            <span className="mark"><Icon name="lock" size={13} /></span> env-vault
          </div>
          <div className="search-wrap">
            <Icon name="search" size={15} />
            <input
              ref={searchRef}
              type="search"
              id="searchInput"
              placeholder="search key, value, or project…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>/</kbd>
          </div>
          <div className="spacer" />
          <button className="ghost small with-icon" onClick={() => setModal({ kind: "usage" })}>
            <Icon name="book" size={15} /> Usage
          </button>
          <button className="ghost small with-icon" onClick={logout}>
            <Icon name="logOut" size={15} /> Log out
          </button>
        </div>
      </header>

      <main>
        <div className="toolbar">
          <div className="chips-scroll">
            {chips.map(([label, value]) => (
              <button key={value} className={"chip" + (activeProject === value ? " active" : "")} onClick={() => setActiveProject(value)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {vars === null ? (
          Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton-row" />)
        ) : shown.length > 0 ? (
          shown.map((v) => (
            <VarRow
              key={v.key}
              v={v}
              revealed={revealed.has(v.key)}
              onToggleReveal={() => toggleReveal(v.key)}
              onCopy={() => copyValue(v)}
              onEdit={() => setModal({ kind: "var", editing: v })}
              onDelete={() => deleteVar(v.key)}
            />
          ))
        ) : (
          <div className="empty">
            <Icon name={vars.length ? "search" : "lock"} size={32} />
            <div className="empty-title">{vars.length ? "No matches" : "No variables yet"}</div>
            <div>{vars.length ? "Try a different search or filter." : "Add your first one below."}</div>
          </div>
        )}
      </main>

      <div id="fabBar">
        <div className="bar-inner">
          <button className="ghost" onClick={() => setModal({ kind: "project" })}>
            <Icon name="folder" size={16} /> Project
          </button>
          <button onClick={() => setModal({ kind: "var", editing: null })}>
            <Icon name="plus" size={16} /> Variable
          </button>
        </div>
      </div>

      {modal?.kind === "var" && <VarModal editing={modal.editing} projects={projects} onClose={closeModal} onSaved={refreshAll} />}
      {modal?.kind === "project" && <ProjectModal onClose={closeModal} onSaved={refreshAll} />}
      {modal?.kind === "usage" && <UsageModal projects={projects} onClose={closeModal} />}
    </div>
  );
}
