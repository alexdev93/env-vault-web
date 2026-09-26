import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, owners, UnauthorizedError, type Branch, type BranchVar, type Project, type ProjectDetail, type Var } from "../lib/api";
import { longDate, shortAge } from "../lib/format";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Dialog } from "../ui/Dialog";
import { EmptyState, ErrorBanner, SkeletonRows } from "../ui/EmptyState";
import { Highlight } from "../ui/Highlight";
import { Icon } from "../ui/Icon";
import { SecretField } from "../ui/SecretField";
import { Seg } from "../ui/Seg";
import { Tag } from "../ui/Tag";
import { BranchVarDialog } from "./BranchVarDialog";
import { HistoryList } from "./HistoryList";
import { PageHead, type Guard } from "./ProjectPages";
import { useCopy } from "./useCopy";

/** "Default · no branch" or one of the project's branches. Changing it re-reads every value for that branch. */
export function BranchSwitch({ project, branchId, onChange }: { project: Project; branchId: string | null; onChange: (id: string | null) => void }) {
  if (project.branches.length === 0) return null;
  return (
    <label className="sort branch-switch">
      <span className="muted sort-label">Branch</span>
      <select className="select mono" aria-label="Branch" value={branchId ?? ""} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">default · no branch</option>
        {project.branches.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
    </label>
  );
}

type Source = "override" | "branch" | "default";

interface Row {
  key: string;
  source: Source;
  notes: string;
  updated_at: string;
  /** The branch's own value, when it has one. */
  bv?: BranchVar;
}

const SOURCE_TAG: Record<Source, (b: string) => ReactNode> = {
  override: (b) => <Tag tone="accent">set on {b}</Tag>,
  branch: (b) => <Tag tone="accent">only on {b}</Tag>,
  default: () => <Tag tone="outline">default</Tag>,
};

type Filter = "all" | "own" | "inherited";

interface Props {
  project: Project;
  branchId: string;
  vars: Var[];
  tabs: ReactNode;
  branchSwitch: ReactNode;
  guard: Guard;
  onChanged: () => Promise<void>;
  /** Edit the project default (the variable itself). */
  onEditDefault: (key: string) => void;
}

/**
 * A project's variables as one branch sees them: its own values, and the
 * defaults it inherits. This is exactly what `envvault run <project> -b <branch>` gets.
 */
export function BranchVarsView({ project, branchId, vars, tabs, branchSwitch, guard, onChanged, onEditDefault }: Props) {
  const copy = useCopy();
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [dialog, setDialog] = useState<
    | { kind: "view"; key: string }
    | { kind: "edit"; editing: BranchVar | null; initialKey?: string }
    | { kind: "remove"; bv: BranchVar }
    | null
  >(null);
  const close = () => setDialog(null);

  const load = useCallback(
    () =>
      guard(async () => {
        try {
          setDetail(await api.getProject(project.id));
          setLoadError(null);
        } catch (e) {
          if (e instanceof UnauthorizedError) throw e;
          setLoadError((e as Error).message);
        }
      }),
    [guard, project.id],
  );

  useEffect(() => {
    load();
  }, [load, project, vars]);

  const branch = detail?.branches.find((b) => b.id === branchId) ?? null;
  const varByKey = useMemo(() => new Map(vars.map((v) => [v.key, v])), [vars]);

  const rows = useMemo<Row[]>(() => {
    if (!branch) return [];
    const own = new Map(branch.vars.map((v) => [v.key, v]));
    const keys = [...new Set([...project.keys, ...own.keys()])].sort();
    return keys.map((key) => {
      const bv = own.get(key);
      const v = varByKey.get(key);
      if (bv) return { key, source: bv.overrides ? "override" : "branch", notes: bv.notes || v?.notes || "", updated_at: bv.updated_at, bv };
      return { key, source: "default", notes: v?.notes ?? "", updated_at: v?.updated_at ?? "" };
    });
  }, [branch, project.keys, varByKey]);

  const q = query.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (filter === "all" || (filter === "own" ? r.source !== "default" : r.source === "default")) &&
      (!q || r.key.toLowerCase().includes(q) || r.notes.toLowerCase().includes(q)),
  );
  const ownCount = rows.filter((r) => r.source !== "default").length;

  const changed = async () => {
    await onChanged();
    await load();
  };

  const viewing = dialog?.kind === "view" ? rows.find((r) => r.key === dialog.key) : undefined;
  const branchName = branch?.name ?? "…";

  const copyRow = (r: Row) =>
    guard(async () => copy(r.bv ? await api.getBranchValue(branchId, r.key) : await api.getValue(r.key), `${r.key} (${branchName})`, true));

  return (
    <section className="list-pane" aria-label={`${project.name} variables on ${branchName}`}>
      <PageHead
        project={project}
        tabs={tabs}
        actions={
          <Button variant="primary" className="new-btn" trailing={<Icon name="plus" size={15} />} onClick={() => setDialog({ kind: "edit", editing: null })} disabled={!branch}>
            New on {branchName}
          </Button>
        }
      />
      <div className="list-toolbar">
        <div className="search">
          <Icon name="search" size={15} />
          <input className="input" type="search" aria-label="Filter by key or notes" placeholder="filter keys…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {branchSwitch}
        <Seg
          label="Show"
          value={filter}
          onChange={setFilter}
          options={[["all", `All · ${rows.length}`], ["own", `Set on ${branchName} · ${ownCount}`], ["inherited", `Default · ${rows.length - ownCount}`]]}
        />
      </div>
      <div className="branch-banner">
        <span className="type-code">[BRANCH]</span>
        <span className="grow">
          What <span className="mono">envvault run {project.name} -b {branchName}</span> gets: values set on <span className="mono">{branchName}</span>, and the
          project default for everything else.
        </span>
      </div>

      <div className="list-cols" aria-hidden="true">
        <span>Type</span><span>Name</span><span>Value from</span><span className="right">Changed</span>
      </div>
      <div className="list-scroll">
        {loadError && <ErrorBanner onRetry={load}>Couldn’t load the branch: {loadError}</ErrorBanner>}
        {detail === null ? (
          <SkeletonRows />
        ) : !branch ? (
          <EmptyState title="That branch is gone">Pick another branch, or the default.</EmptyState>
        ) : shown.length ? (
          <ul className="rows">
            {shown.map((r) => (
              <li key={r.key} className="row">
                <button type="button" className="row-main" onClick={() => setDialog({ kind: "view", key: r.key })}>
                  <span className="type-code">[VAR]</span>
                  <span className="row-name">
                    <span className="row-key mono"><Highlight text={r.key} query={query} /></span>
                    <span className="row-meta">{r.notes ? r.notes.split("\n")[0] : r.source === "default" ? "Inherited from the project default" : `Set on ${branchName}`}</span>
                  </span>
                  <span className="row-tags">{SOURCE_TAG[r.source](branchName)}</span>
                  <time className="row-age" dateTime={r.updated_at} title={r.updated_at ? longDate(r.updated_at) : undefined}>{r.updated_at ? shortAge(r.updated_at) : ""}</time>
                </button>
                <button type="button" className="btn btn-icon btn-lg row-copy" aria-label={`Copy ${r.key}`} onClick={() => copyRow(r)}>
                  <Icon name="copy" size={16} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title={rows.length ? "Nothing matches" : `Nothing on ${branchName} yet`}
            actions={<Button variant="primary" onClick={() => setDialog({ kind: "edit", editing: null })}>Add a value for {branchName}</Button>}
          >
            {rows.length ? "Try another filter." : "The project has no defaults and this branch has no values of its own."}
          </EmptyState>
        )}
      </div>

      {viewing && branch && (
        <BranchValueDialog
          project={project}
          branch={branch}
          row={viewing}
          onClose={close}
          onChanged={changed}
          onEdit={() => viewing.bv && setDialog({ kind: "edit", editing: viewing.bv })}
          onOverride={() => setDialog({ kind: "edit", editing: null, initialKey: viewing.key })}
          onRemove={() => viewing.bv && setDialog({ kind: "remove", bv: viewing.bv })}
          onEditDefault={() => {
            close();
            onEditDefault(viewing.key);
          }}
        />
      )}
      {dialog?.kind === "edit" && branch && (
        <BranchVarDialog project={project} branch={branch} editing={dialog.editing} initialKey={dialog.initialKey} onClose={close} onSaved={changed} />
      )}
      {dialog?.kind === "remove" && branch && (
        <ConfirmDialog
          title={<>{dialog.bv.overrides ? "Stop overriding" : "Delete"} <span className="mono break">{dialog.bv.key}</span> on {branch.name}?</>}
          confirmLabel={dialog.bv.overrides ? "Use the default" : "Delete variable"}
          onClose={close}
          onConfirm={() =>
            guard(async () => {
              await api.deleteBranchVar(branch.id, dialog.bv.key);
              close();
              await changed();
            })
          }
        >
          {dialog.bv.overrides
            ? <>{branch.name} goes back to the project’s default value. Its own value and its history are deleted.</>
            : <>{branch.name} won’t have this key any more. Its value and history are deleted.</>}
        </ConfirmDialog>
      )}
    </section>
  );
}

interface ValueDialogProps {
  project: Project;
  branch: Branch;
  row: Row;
  onClose: () => void;
  onChanged: () => Promise<void>;
  onEdit: () => void;
  onOverride: () => void;
  onRemove: () => void;
  onEditDefault: () => void;
}

function BranchValueDialog({ project, branch, row, onClose, onChanged, onEdit, onOverride, onRemove, onEditDefault }: ValueDialogProps) {
  const copy = useCopy();
  const own = !!row.bv;
  return (
    <Dialog
      eyebrow={<span className="eyebrow-row"><span className="eyebrow accent">Variable · -b {branch.name}</span>{SOURCE_TAG[row.source](branch.name)}</span>}
      title={<span className="mono break">{row.key}</span>}
      onClose={onClose}
      width={560}
      footer={
        own ? (
          <>
            <Button variant="primary" size="lg" className="grow" onClick={onEdit}>Edit {branch.name}’s value</Button>
            <Button variant="danger" size="lg" onClick={onRemove}>{row.source === "override" ? "Use default" : "Delete"}</Button>
          </>
        ) : (
          <>
            <Button variant="primary" size="lg" className="grow" onClick={onOverride}>Give {branch.name} its own value</Button>
            <Button size="lg" onClick={onEditDefault}>Edit the default</Button>
          </>
        )
      }
    >
      <div className="detail-body">
        <div className="callout">
          {row.source === "override" && <><strong>{branch.name} has its own value.</strong> It replaces the project default when running with <span className="mono">-b {branch.name}</span>.</>}
          {row.source === "branch" && <><strong>Only {branch.name} has this.</strong> Runs without <span className="mono">-b {branch.name}</span> don’t get it.</>}
          {row.source === "default" && <><strong>Inherited.</strong> {branch.name} uses the project’s default value. Give it its own to change it for this branch only.</>}
        </div>
        <div>
          <div className="detail-label">Value on {branch.name}</div>
          <SecretField
            key={`${branch.id}:${row.key}:${row.source}`}
            label={`${row.key} on ${branch.name}`}
            fetchValue={() => (own ? api.getBranchValue(branch.id, row.key) : api.getValue(row.key))}
            onCopy={(value) => copy(value, `${row.key} (${branch.name})`, true)}
          />
        </div>
        {row.source === "override" && (
          <div>
            <div className="detail-label">Project default, for comparison</div>
            <SecretField key={`default:${row.key}`} label={`${row.key} default`} fetchValue={() => api.getValue(row.key)} onCopy={(value) => copy(value, `${row.key} (default)`, true)} />
          </div>
        )}
        <div>
          <div className="detail-label">Notes</div>
          {row.notes ? <p className="notes-text">{row.notes}</p> : <p className="muted small">No notes.</p>}
        </div>
        <HistoryList
          owner={own ? owners.branch(branch.id, row.key) : owners.var(row.key)}
          label={own ? `${row.key} on ${branch.name}` : `${row.key} default`}
          version={row.updated_at}
          onRestored={onChanged}
        />
        <p className="muted small">
          {own ? `History of ${branch.name}’s own value.` : "History of the project default."} Used by{" "}
          <span className="mono">envvault run {project.name} -b {branch.name}</span>.
        </p>
      </div>
    </Dialog>
  );
}
