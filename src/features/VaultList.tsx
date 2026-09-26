import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import type { Project, Var } from "../lib/api";
import { longDate, shortAge } from "../lib/format";
import { Button } from "../ui/Button";
import { EmptyState, ErrorBanner, SkeletonRows } from "../ui/EmptyState";
import { Highlight } from "../ui/Highlight";
import { Icon } from "../ui/Icon";
import { Seg } from "../ui/Seg";
import { Tag } from "../ui/Tag";

export type Filter = "all" | "shared" | "untagged";
export type Sort = "changed" | "name";

export function applyListState(vars: Var[], project: string | null, filter: Filter, query: string, sort: Sort): Var[] {
  const q = query.trim().toLowerCase();
  const out = vars.filter((v) => {
    if (project && !v.projects.includes(project)) return false;
    if (filter === "shared" && !v.shared) return false;
    if (filter === "untagged" && v.projects.length > 0) return false;
    return !q || v.key.toLowerCase().includes(q) || v.notes.toLowerCase().includes(q) || v.projects.some((p) => p.toLowerCase().includes(q));
  });
  return sort === "name" ? out.sort((a, b) => a.key.localeCompare(b.key)) : out.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function metaLine(v: Var): string {
  if (v.notes) return v.notes.split("\n")[0];
  if (v.projects.length === 0) return "Personal · not used by a project";
  if (v.shared) return `Shared by ${v.projects.length} projects`;
  return `Used by ${v.projects[0]}`;
}

interface Props {
  vars: Var[] | null; // null while loading
  shown: Var[];
  loadError: string | null;
  onRetry: () => void;
  project: Project | null;
  query: string;
  onQuery: (q: string) => void;
  filter: Filter;
  onFilter: (f: Filter) => void;
  sort: Sort;
  onSort: (s: Sort) => void;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onOpen: (key: string) => void;
  onCopy: (key: string) => void;
  onNew: () => void;
  onNewProject: () => void;
  searchRef: RefObject<HTMLInputElement | null>;
  /** Project section tabs, shown under the heading on a project page. */
  tabs?: ReactNode;
}

export function VaultList(p: Props) {
  const listRef = useRef<HTMLUListElement>(null);

  // Keep the keyboard selection visible as j/k move it.
  useEffect(() => {
    listRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "nearest" });
  }, [p.selectedKey]);

  const total = p.vars?.length ?? 0;
  const count = (f: Filter) => (p.vars ? applyListState(p.vars, p.project?.name ?? null, f, "", "name").length : 0);

  return (
    <section className="list-pane" aria-labelledby="list-title">
      <header className="page-head">
        <div className="grow">
          <div className="eyebrow">{p.project ? "Project" : "Vault"}</div>
          <h1 id="list-title" className={p.project ? "mono" : undefined}>{p.project ? p.project.name : "All items"}</h1>
          {p.project?.description && <p className="page-sub">{p.project.description}</p>}
        </div>
        <Button className="hide-phone" onClick={p.onNewProject}>New project</Button>
        <Button variant="primary" className="new-btn" trailing={<Icon name="plus" size={15} />} onClick={p.onNew}>
          New variable
        </Button>
      </header>
      {p.tabs}

      <div className="list-toolbar">
        <div className="search">
          <Icon name="search" size={15} />
          <input
            ref={p.searchRef}
            className="input"
            type="search"
            aria-label="Filter by key, notes or project"
            placeholder="filter keys…"
            value={p.query}
            onChange={(e) => p.onQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                p.onQuery("");
                e.currentTarget.blur();
              }
            }}
          />
          <kbd aria-hidden="true">/</kbd>
        </div>
        <Seg
          label="Show"
          value={p.filter}
          onChange={p.onFilter}
          options={[["all", "All"], ["shared", `Shared · ${count("shared")}`], ["untagged", `Untagged · ${count("untagged")}`]]}
        />
        <span className="grow hide-phone" />
        {/* Phones get two dropdowns in place of the segment + sort, so nothing scrolls sideways (1h). */}
        <div className="list-selects">
          <select className="select phone-only" aria-label="Show" value={p.filter} onChange={(e) => p.onFilter(e.target.value as Filter)}>
            <option value="all">Show: All</option>
            <option value="shared">Show: Shared</option>
            <option value="untagged">Show: Untagged</option>
          </select>
          <label className="sort">
            <span className="muted sort-label">Sort</span>
            <select className="select" aria-label="Sort" value={p.sort} onChange={(e) => p.onSort(e.target.value as Sort)}>
              <option value="changed">Recent first</option>
              <option value="name">Name A–Z</option>
            </select>
          </label>
        </div>
      </div>

      <div className="list-cols" aria-hidden="true">
        <span>Type</span><span>Name</span><span>Projects</span><span className="right">Changed</span>
      </div>

      <div className="list-scroll">
        {p.loadError && <ErrorBanner onRetry={p.onRetry}>Couldn’t load your vault: {p.loadError}</ErrorBanner>}
        {p.vars === null ? (
          <SkeletonRows />
        ) : p.shown.length > 0 ? (
          <ul className="rows" ref={listRef} aria-label={`${p.shown.length} of ${total} items`}>
            {p.shown.map((v) => (
              <li key={v.key} className="row" aria-current={v.key === p.selectedKey || undefined}>
                <button type="button" className="row-main" onClick={() => p.onOpen(v.key)} onFocus={() => p.onSelect(v.key)}>
                  <span className="type-code">[VAR]</span>
                  <span className="row-name">
                    <span className="row-key mono"><Highlight text={v.key} query={p.query} /></span>
                    <span className="row-meta">{metaLine(v)}</span>
                  </span>
                  <span className="row-tags">
                    {v.projects.map((name) => <Tag key={name} mono><Highlight text={name} query={p.query} /></Tag>)}
                    {v.shared && <Tag tone="accent">shared</Tag>}
                    {v.projects.length === 0 && <span className="muted small">Personal</span>}
                  </span>
                  <time className="row-age" dateTime={v.updated_at} title={longDate(v.updated_at)}>{shortAge(v.updated_at)}</time>
                </button>
                <button type="button" className="btn btn-icon btn-lg row-copy" aria-label={`Copy ${v.key}`} onClick={() => p.onCopy(v.key)}>
                  <Icon name="copy" size={16} />
                </button>
              </li>
            ))}
          </ul>
        ) : total === 0 ? (
          <EmptyState
            title="Your vault is empty."
            actions={<><Button variant="primary" onClick={p.onNew}>Add your first secret</Button><Button onClick={p.onNewProject}>Create a project</Button></>}
          >
            Add your first secret, then tag it with the projects that use it.
          </EmptyState>
        ) : (
          <EmptyState
            title={p.query ? <>Nothing matches ‘{p.query}’</> : "Nothing here yet"}
            actions={
              p.query ? (
                <button type="button" className="link" onClick={() => p.onQuery("")}>Clear search</button>
              ) : (
                p.filter !== "all" && <button type="button" className="link" onClick={() => p.onFilter("all")}>Show all</button>
              )
            }
          >
            {p.query ? "Search looks at key names, notes and project names, never values." : p.project ? "No variables in this project match this filter." : "No variables match this filter."}
          </EmptyState>
        )}
      </div>
    </section>
  );
}
