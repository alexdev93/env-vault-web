import type { Project } from "../lib/api";
import { projectColor } from "../lib/format";
import { Icon } from "../ui/Icon";
import { isMac } from "./shortcuts";

export type View = { kind: "vault"; project: string | null } | { kind: "settings" };

interface Props {
  view: View;
  total: number;
  projects: Project[];
  onNavigate: (view: View) => void;
  onPalette: () => void;
  onNewProject: () => void;
  onUsage: () => void;
  onLogout: () => void;
}

export function Sidebar({ view, total, projects, onNavigate, onPalette, onNewProject, onUsage, onLogout }: Props) {
  const isAll = view.kind === "vault" && view.project === null;
  const current = (on: boolean) => (on ? { "aria-current": "page" as const } : {});

  return (
    <nav className="sidebar" aria-label="Vault">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">&gt;</span>
        env-vault
        <span className="caret" aria-hidden="true" />
      </div>
      <button type="button" className="btn btn-secondary palette-btn" onClick={onPalette}>
        <Icon name="search" size={15} />
        <span className="grow">Jump to…</span>
        <kbd>{isMac ? "⌘K" : "ctrl+k"}</kbd>
      </button>

      <div className="nav-list">
        <button type="button" className="nav-item" {...current(isAll)} onClick={() => onNavigate({ kind: "vault", project: null })}>
          <span className="grow">All items</span>
          <span className="nav-count">{total}</span>
        </button>
      </div>

      <div className="nav-heading">
        <span>Projects</span>
        <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="New project" onClick={onNewProject}>
          <Icon name="plus" size={15} />
        </button>
      </div>
      <div className="nav-list">
        {projects.map((p) => (
          <button
            key={p.id}
            type="button"
            className="nav-item"
            {...current(view.kind === "vault" && view.project === p.name)}
            onClick={() => onNavigate({ kind: "vault", project: p.name })}
          >
            <span className="swatch" style={{ background: projectColor(p.name) }} aria-hidden="true" />
            <span className="grow mono">{p.name}</span>
            <span className="nav-count">{p.keys.length}</span>
          </button>
        ))}
        {projects.length === 0 && <p className="nav-empty">No projects yet.</p>}
      </div>

      <div className="nav-foot">
        <button type="button" className="nav-item" onClick={onUsage}>
          <Icon name="terminal" size={15} /> <span className="grow">Use in your app</span>
        </button>
        <button type="button" className="nav-item" {...current(view.kind === "settings")} onClick={() => onNavigate({ kind: "settings" })}>
          <Icon name="settings" size={15} /> <span className="grow">Settings</span>
        </button>
        <button type="button" className="nav-item" onClick={onLogout}>
          <Icon name="logOut" size={15} /> <span className="grow">Lock vault</span>
        </button>
      </div>
    </nav>
  );
}
