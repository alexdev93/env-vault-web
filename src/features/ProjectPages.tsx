import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api, owners, UnauthorizedError, type Branch, type BranchVar, type Item, type Project, type ProjectDetail, type Service } from "../lib/api";
import { findKind, findProvider, hrefFor, longDate, PROJECT_STATUSES } from "../lib/format";
import { Button } from "../ui/Button";
import { CodeBlock } from "../ui/CodeBlock";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { EmptyState, ErrorBanner, SkeletonRows } from "../ui/EmptyState";
import { Icon } from "../ui/Icon";
import { SecretField } from "../ui/SecretField";
import { Tag } from "../ui/Tag";
import { BranchDialog } from "./BranchDialog";
import { BranchVarDialog } from "./BranchVarDialog";
import { HistoryList } from "./HistoryList";
import { ServiceDialog } from "./ServiceDialog";
import { useCopy } from "./useCopy";

export type ProjectTab = "vars" | "overview" | "branches";

export type Guard = (fn: () => Promise<void>) => Promise<void>;

/** Tabs under a project's heading. Shared by the variable list and the pages below. */
export function ProjectTabs({ project, tab, onTab }: { project: Project; tab: ProjectTab; onTab: (t: ProjectTab) => void }) {
  const tabs: [ProjectTab, string][] = [
    ["vars", `Variables · ${project.keys.length}`],
    ["overview", "Overview"],
    ["branches", `Branches · ${project.branches.length}`],
  ];
  return (
    <div className="tabs" role="tablist" aria-label={`${project.name} sections`}>
      {tabs.map(([t, label]) => (
        <button key={t} type="button" role="tab" className="tab" aria-selected={tab === t} onClick={() => onTab(t)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function StatusTag({ status }: { status: string }) {
  const st = PROJECT_STATUSES.find((s) => s.id === status);
  if (!st) return null;
  return <span className={`status status-${st.id}`} title={st.hint}>{st.label}</span>;
}

/** A project page's heading: name, status, description and stack, then the tabs. */
export function PageHead({ project, tabs, actions }: { project: Project; tabs: ReactNode; actions?: ReactNode }) {
  return (
    <>
      <header className="page-head">
        <div className="grow">
          <div className="eyebrow-row page-eyebrow">
            <span className="eyebrow">Project</span>
            <StatusTag status={project.status} />
          </div>
          <h1 className="mono">{project.name}</h1>
          {(project.description || project.stack) && (
            <p className="page-sub">
              {project.description}
              {project.description && project.stack && " · "}
              {project.stack && <span className="mono">{project.stack}</span>}
            </p>
          )}
        </div>
        {actions}
      </header>
      {tabs}
    </>
  );
}

export function ExtLink({ url, label }: { url: string; label?: string }) {
  return (
    <a className="ext-link mono" href={hrefFor(url)} target="_blank" rel="noreferrer noopener">
      {label ?? url.replace(/^https?:\/\//, "")} <span aria-hidden="true">↗</span>
    </a>
  );
}

const looksLikeUrl = (v: string) => /^(https?:\/\/|www\.)\S+$/i.test(v.trim());

// ---------------------------------------------------------------- overview

interface OverviewProps {
  project: Project;
  tabs: ReactNode;
  guard: Guard;
  /** Personal items (logins, notes, secrets) linked to this project. */
  items: Item[];
  onEdit: () => void;
  onDelete: () => void;
  onChanged: () => Promise<void>;
  onNewVar: () => void;
  onOpenVar: (key: string) => void;
  onOpenItem: (id: string) => void;
  onNewItem: () => void;
  onTab: (t: ProjectTab) => void;
  onUsage: () => void;
  /** Who pulls this project, shown under the setup checklist. */
  heartbeat?: ReactNode;
}

export function ProjectOverview(p: OverviewProps) {
  const { project } = p;
  const copy = useCopy();
  const [dialog, setDialog] = useState<{ kind: "service"; editing: Service | null } | { kind: "delete"; service: Service } | null>(null);
  const close = () => setDialog(null);

  const steps = [
    { done: !!(project.description || project.stack), label: "Say what it is and what it’s built with", action: <Button size="sm" onClick={p.onEdit}>Describe it</Button> },
    { done: project.keys.length > 0, label: "Add its variables", action: <Button size="sm" onClick={p.onNewVar}>New variable</Button> },
    { done: project.services.length > 0, label: "Record where it lives: database, hosting…", action: <Button size="sm" onClick={() => setDialog({ kind: "service", editing: null })}>Add service</Button> },
    { done: !!(project.site_url || project.repo_url), label: "Add the live site or repository", action: <Button size="sm" onClick={p.onEdit}>Add links</Button> },
    { done: project.branches.length > 0, label: "Optional: branches with their own values", action: <Button size="sm" onClick={() => p.onTab("branches")}>Branches</Button> },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const knownKeys = new Set(project.keys);

  return (
    <section className="list-pane" aria-label={`${project.name} overview`}>
      <PageHead
        project={project}
        tabs={p.tabs}
        actions={<Button variant="primary" className="new-btn" trailing={<Icon name="edit" size={15} />} onClick={p.onEdit}>Edit project</Button>}
      />
      <div className="list-scroll">
        <div className="project-page">
          {doneCount < steps.length && (
            <section className="card setup" aria-label="Setup checklist">
              <div className="card-head">
                <h2 className="section-title grow">Set up {project.name}</h2>
                <span className="muted small">{doneCount} of {steps.length} done</span>
              </div>
              <div className="progress" aria-hidden="true"><span style={{ width: `${(doneCount / steps.length) * 100}%` }} /></div>
              <ol className="setup-steps">
                {steps.map((s) => (
                  <li key={s.label} className={s.done ? "done" : undefined}>
                    <span className="setup-mark" aria-hidden="true">{s.done ? "✓" : "·"}</span>
                    <span className="grow">{s.label}{s.done && <span className="visually-hidden"> (done)</span>}</span>
                    {!s.done && s.action}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {p.heartbeat}

          <section className="section">
            <h2 className="section-title">About</h2>
            <dl className="details">
              <dt>Status</dt>
              <dd>{project.status ? <StatusTag status={project.status} /> : <button type="button" className="link" onClick={p.onEdit}>Set a status</button>}</dd>
              <dt>Stack</dt>
              <dd>{project.stack ? <span className="mono">{project.stack}</span> : <button type="button" className="link" onClick={p.onEdit}>Add the stack</button>}</dd>
              <dt>Live site</dt>
              <dd>{project.site_url ? <ExtLink url={project.site_url} /> : <button type="button" className="link" onClick={p.onEdit}>Add the URL</button>}</dd>
              <dt>Repository</dt>
              <dd>{project.repo_url ? <ExtLink url={project.repo_url} /> : <button type="button" className="link" onClick={p.onEdit}>Add the repo</button>}</dd>
              {project.details.map((d, i) => (
                <DetailRow key={i} label={d.label} value={d.value} />
              ))}
              <dt>Created</dt>
              <dd>{longDate(project.created_at)}</dd>
              {project.updated_at && project.updated_at !== project.created_at && (
                <>
                  <dt>Changed</dt>
                  <dd>{longDate(project.updated_at)}</dd>
                </>
              )}
            </dl>
            <div><Button size="sm" variant="ghost" onClick={p.onEdit}><Icon name="plus" size={14} /> Add details</Button></div>
          </section>

          <section className="section">
            <div className="section-head">
              <h2 className="section-title grow">Notes</h2>
              <Button size="sm" variant="ghost" onClick={p.onEdit}><Icon name="edit" size={14} /> Edit</Button>
            </div>
            {project.notes ? <p className="notes-text">{project.notes}</p> : <p className="muted">No notes yet. Write down how it deploys, gotchas, anything you’d otherwise forget.</p>}
          </section>

          <section className="section">
            <div className="section-head">
              <h2 className="section-title grow">Services</h2>
              <Button size="sm" trailing={<Icon name="plus" size={14} />} onClick={() => setDialog({ kind: "service", editing: null })}>Add service</Button>
            </div>
            <p className="field-hint">Where it’s deployed and what it depends on, which account you sign in with, and which variables come from each.</p>
            {project.services.length ? (
              <ul className="cards">
                {project.services.map((s) => {
                  const kind = findKind(s.kind);
                  const preset = findProvider(s.kind, s.provider);
                  const title = preset?.label ?? (s.provider || kind?.label || s.kind);
                  return (
                    <li key={s.id} className="card">
                      <div className="card-head">
                        <span className="type-code">[{(kind?.label ?? (s.kind || "service")).toUpperCase()}]</span>
                        <strong className="grow" title={title}>{title}</strong>
                        <Button size="sm" variant="ghost" icon aria-label={`Edit ${title}`} onClick={() => setDialog({ kind: "service", editing: s })}>
                          <Icon name="edit" size={14} />
                        </Button>
                        <Button size="sm" variant="ghost" icon aria-label={`Delete ${title}`} onClick={() => setDialog({ kind: "delete", service: s })}>
                          <Icon name="trash" size={14} />
                        </Button>
                      </div>
                      {(s.region || s.plan) && (
                        <div className="tag-row">
                          {s.region && <Tag tone="outline">{s.region}</Tag>}
                          {s.plan && <Tag tone="outline">{s.plan}</Tag>}
                        </div>
                      )}
                      {(s.name || s.url || s.account) && (
                        <dl className="details details-tight">
                          {s.name && (<><dt>Name there</dt><dd className="mono">{s.name}</dd></>)}
                          {s.url && (<><dt>Console</dt><dd><ExtLink url={s.url} /></dd></>)}
                          {s.account && (<><dt>Signed in as</dt><dd className="mono">{s.account}</dd></>)}
                        </dl>
                      )}
                      {s.var_keys.length > 0 && (
                        <div className="stack-sm">
                          <span className="detail-label">Provides</span>
                          <div className="tag-row">
                            {s.var_keys.map((k) =>
                              knownKeys.has(k) ? (
                                <button key={k} type="button" className="tag tag-neutral mono tag-link" onClick={() => p.onOpenVar(k)}>{k}</button>
                              ) : (
                                <Tag key={k} mono tone="outline">{k}</Tag>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                      {s.notes && <p className="notes-text small">{s.notes}</p>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                title="Where does it live?"
                actions={<Button variant="primary" onClick={() => setDialog({ kind: "service", editing: null })}>Add the first service</Button>}
              >
                Record the database, the hosting, the email provider… with their console links and the account you sign in with.
              </EmptyState>
            )}
          </section>

          <section className="section">
            <div className="section-head">
              <h2 className="section-title grow">Logins & notes</h2>
              <Button size="sm" trailing={<Icon name="plus" size={14} />} onClick={p.onNewItem}>Add</Button>
            </div>
            <p className="field-hint">Personal vault items linked to this project: dashboard logins, recovery codes, notes.</p>
            {p.items.length ? (
              <ul className="link-list">
                {p.items.map((it) => (
                  <li key={it.id}>
                    <button type="button" className="link-row" onClick={() => p.onOpenItem(it.id)}>
                      <span className="type-code">[{ITEM_CODES[it.type]}]</span>
                      <span className="grow">{it.title}</span>
                      {it.username && <span className="muted small mono">{it.username}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">None yet.</p>
            )}
          </section>

          <section className="section">
            <div className="section-head">
              <h2 className="section-title grow">From the terminal</h2>
              <Button size="sm" variant="ghost" onClick={p.onUsage}>More ways to run it</Button>
            </div>
            <CodeBlock
              tone="dark"
              code={`envvault info ${project.name}\nenvvault run ${project.name} -- node server.js${project.branches[0] ? `\nenvvault run ${project.name} -b ${project.branches[0].name} -- node server.js` : ""}`}
              onCopy={(c) => copy(c, "command")}
            />
          </section>

          <section className="section">
            <h2 className="section-title">Delete</h2>
            <p className="muted">Removes the project with its services and branches. Its variables stay in the vault, untagged from it; linked logins and notes stay too.</p>
            <div><Button variant="danger" onClick={p.onDelete}>Delete {project.name}</Button></div>
          </section>
        </div>
      </div>

      {dialog?.kind === "service" && <ServiceDialog project={project} editing={dialog.editing} onClose={close} onSaved={p.onChanged} />}
      {dialog?.kind === "delete" && (
        <ConfirmDialog
          title={<>Delete {dialog.service.provider || dialog.service.kind}?</>}
          confirmLabel="Delete service"
          onClose={close}
          onConfirm={() =>
            p.guard(async () => {
              await api.deleteService(dialog.service.id);
              close();
              await p.onChanged();
            })
          }
        >
          Only the record of it is removed from <span className="mono">{project.name}</span>. Nothing changes at the provider, and its variables stay.
        </ConfirmDialog>
      )}
    </section>
  );
}

export const ITEM_CODES = { login: "LOGIN", note: "NOTE", secret: "SECRET" } as const;

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label || "—"}</dt>
      <dd>{looksLikeUrl(value) ? <ExtLink url={value} /> : <span className="notes-text">{value}</span>}</dd>
    </>
  );
}

// ---------------------------------------------------------------- branches

type BranchDialogState =
  | { kind: "branch"; editing: Branch | null }
  | { kind: "deleteBranch"; branch: Branch }
  | { kind: "var"; branch: Branch; editing: BranchVar | null }
  | { kind: "deleteVar"; branch: Branch; v: BranchVar }
  | null;

interface BranchesProps {
  project: Project;
  tabs: ReactNode;
  guard: Guard;
  onChanged: () => Promise<void>;
}

export function ProjectBranches({ project, tabs, guard, onChanged }: BranchesProps) {
  const copy = useCopy();
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<BranchDialogState>(null);
  const close = () => setDialog(null);

  const load = useCallback(
    () =>
      guard(async () => {
        try {
          setDetail(await api.getProject(project.id));
          setLoadError(null);
        } catch (e) {
          if (e instanceof UnauthorizedError) throw e; // guard locks the vault
          setLoadError((e as Error).message);
        }
      }),
    [guard, project.id],
  );

  // Reload when the project changes (its list entry is replaced on every refresh).
  useEffect(() => {
    load();
  }, [load, project]);

  const changed = async () => {
    await onChanged();
    await load();
  };

  return (
    <section className="list-pane" aria-label={`${project.name} branches`}>
      <PageHead
        project={project}
        tabs={tabs}
        actions={<Button variant="primary" className="new-btn" trailing={<Icon name="plus" size={15} />} onClick={() => setDialog({ kind: "branch", editing: null })}>New branch</Button>}
      />
      <div className="list-scroll">
        {loadError && <ErrorBanner onRetry={load}>Couldn’t load branches: {loadError}</ErrorBanner>}
        <div className="project-page">
          <p className="muted">
            Every branch starts with the project’s {project.keys.length} default variables. Values set on a branch replace the default with the
            same key, or add a key only that branch has. Without <span className="mono">-b</span> you get the defaults. To see every
            value a branch ends up with, pick it with the branch switch on the Variables tab.
          </p>

          {detail === null ? (
            <SkeletonRows count={3} />
          ) : detail.branches.length === 0 ? (
            <EmptyState
              title="No branches yet"
              actions={<Button variant="primary" onClick={() => setDialog({ kind: "branch", editing: null })}>Add a branch</Button>}
            >
              Add main, staging, or any git branch whose CI needs different values.
            </EmptyState>
          ) : (
            detail.branches.map((b) => {
              const own = new Set(b.vars.map((v) => v.key));
              const inherited = project.keys.filter((k) => !own.has(k));
              return (
                <article key={b.id} className="card branch-card">
                  <div className="card-head">
                    <span className="type-code">[BRANCH]</span>
                    <h2 className="branch-name mono grow">{b.name}</h2>
                    <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: "branch", editing: b })}><Icon name="edit" size={14} /> Edit</Button>
                    <Button size="sm" variant="ghost" icon aria-label={`Delete branch ${b.name}`} onClick={() => setDialog({ kind: "deleteBranch", branch: b })}>
                      <Icon name="trash" size={14} />
                    </Button>
                  </div>
                  {b.notes && <p className="notes-text">{b.notes}</p>}
                  <CodeBlock
                    tone="dark"
                    code={`envvault run ${project.name} -b ${b.name} -- node server.js`}
                    onCopy={(c) => copy(c, "command")}
                  />

                  <div className="section-head">
                    <h3 className="step grow">Set on this branch · {b.vars.length}</h3>
                    <Button size="sm" trailing={<Icon name="plus" size={14} />} onClick={() => setDialog({ kind: "var", branch: b, editing: null })}>Add variable</Button>
                  </div>
                  {b.vars.length ? (
                    <ul className="branch-vars">
                      {b.vars.map((v) => (
                        <li key={v.key} className="branch-var">
                          <div className="branch-var-head">
                            <span className="row-key mono grow">{v.key}</span>
                            {v.overrides ? <Tag tone="accent">overrides default</Tag> : <Tag tone="outline">branch only</Tag>}
                            <Button size="sm" variant="ghost" icon aria-label={`Edit ${v.key}`} onClick={() => setDialog({ kind: "var", branch: b, editing: v })}>
                              <Icon name="edit" size={14} />
                            </Button>
                            <Button size="sm" variant="ghost" icon aria-label={`Delete ${v.key}`} onClick={() => setDialog({ kind: "deleteVar", branch: b, v })}>
                              <Icon name="trash" size={14} />
                            </Button>
                          </div>
                          <SecretField
                            key={`${b.id}:${v.key}`}
                            label={`${v.key} on ${b.name}`}
                            fetchValue={() => api.getBranchValue(b.id, v.key)}
                            onCopy={(value) => copy(value, `${v.key} (${b.name})`, true)}
                          />
                          {v.notes && <p className="field-hint">{v.notes}</p>}
                          <details className="history-toggle">
                            <summary>Earlier values</summary>
                            <HistoryList owner={owners.branch(b.id, v.key)} label={`${v.key} on ${b.name}`} version={v.updated_at} onRestored={changed} />
                          </details>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted small">Nothing set here yet: this branch gets exactly the defaults.</p>
                  )}
                  {inherited.length > 0 && (
                    <div className="stack-sm">
                      <h3 className="step">From the defaults · {inherited.length}</h3>
                      <div className="tag-row">{inherited.map((k) => <Tag key={k} mono tone="outline">{k}</Tag>)}</div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </div>

      {dialog?.kind === "branch" && <BranchDialog project={project} editing={dialog.editing} onClose={close} onSaved={changed} />}
      {dialog?.kind === "var" && (
        <BranchVarDialog project={project} branch={dialog.branch} editing={dialog.editing} onClose={close} onSaved={changed} />
      )}
      {dialog?.kind === "deleteBranch" && (
        <ConfirmDialog
          title={<>Delete branch <span className="mono break">{dialog.branch.name}</span>?</>}
          confirmLabel="Delete branch"
          onClose={close}
          onConfirm={() =>
            guard(async () => {
              await api.deleteBranch(dialog.branch.id);
              close();
              await changed();
            })
          }
        >
          Its own values are deleted, and <span className="mono">envvault run {project.name} -b {dialog.branch.name}</span> will fail until you add it back.
        </ConfirmDialog>
      )}
      {dialog?.kind === "deleteVar" && (
        <ConfirmDialog
          title={<>Delete <span className="mono break">{dialog.v.key}</span> from {dialog.branch.name}?</>}
          confirmLabel="Delete variable"
          onClose={close}
          onConfirm={() =>
            guard(async () => {
              await api.deleteBranchVar(dialog.branch.id, dialog.v.key);
              close();
              await changed();
            })
          }
        >
          {dialog.v.overrides ? <>The branch goes back to the project’s default value.</> : <>The branch won’t have this key any more.</>}
        </ConfirmDialog>
      )}
    </section>
  );
}
