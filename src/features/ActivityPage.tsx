import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, UnauthorizedError, type AccessEvent, type ActivitySummary, type Project } from "../lib/api";
import { ago, longDate } from "../lib/format";
import { Button } from "../ui/Button";
import { ColumnChart, fillDays, Sparkline, StatTile } from "../ui/Charts";
import { EmptyState, ErrorBanner } from "../ui/EmptyState";
import { Icon } from "../ui/Icon";
import { Seg } from "../ui/Seg";
import { Tag } from "../ui/Tag";
import { describe, KIND_CODES, KIND_GROUPS, PULSE_LABEL, pulseOf, whereOf, whoOf } from "./activityText";

type Range = "7" | "30" | "90";

interface Props {
  projects: Project[];
  /** Pre-selected project filter (from a project's Overview). */
  initialProject?: string | null;
  onOpenProject: (name: string) => void;
  onUnauthorized: () => void;
}

/**
 * Who pulled which project's variables, read a secret or changed something,
 * from where, and when. Pulls come from `envvault run|get|list` (or any API
 * call with the token); each server names itself with ENV_VAULT_CLIENT.
 */
export function ActivityPage({ projects, initialProject = null, onOpenProject, onUnauthorized }: Props) {
  const [range, setRange] = useState<Range>("30");
  const [project, setProject] = useState<string>(initialProject ?? "");
  const [group, setGroup] = useState("all");
  const [client, setClient] = useState("");
  const [showTable, setShowTable] = useState(false);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [events, setEvents] = useState<AccessEvent[] | null>(null);
  const [next, setNext] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unauthorized = useRef(onUnauthorized);
  unauthorized.current = onUnauthorized;

  const kinds = KIND_GROUPS.find(([id]) => id === group)?.[2] ?? [];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, ev] = await Promise.all([
        api.activitySummary(Number(range), project),
        api.activity({ project, kind: kinds, client, limit: 50 }),
      ]);
      setSummary(s);
      setEvents(ev.events);
      setNext(ev.next);
      setError(null);
    } catch (e) {
      if (e instanceof UnauthorizedError) return unauthorized.current();
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
    // `kinds` is derived from `group`, which is a dependency.
  }, [range, project, group, client]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    if (!next) return;
    try {
      const ev = await api.activity({ project, kind: kinds, client, before: next, limit: 50 });
      setEvents((all) => [...(all ?? []), ...ev.events]);
      setNext(ev.next);
    } catch (e) {
      if (e instanceof UnauthorizedError) return unauthorized.current();
      setError((e as Error).message);
    }
  };

  const days = Number(range);
  const daily = useMemo(() => fillDays(summary?.daily ?? [], days), [summary, days]);

  // Every project gets a heartbeat row, including ones nothing has pulled yet.
  const heartbeat = useMemo(() => {
    const seen = new Map((summary?.projects ?? []).map((p) => [p.project, p]));
    const names = project ? [project] : [...new Set([...projects.map((p) => p.name), ...seen.keys()])];
    return names
      .map((name) => ({ name, stats: seen.get(name) ?? null, known: projects.some((p) => p.name === name) }))
      .sort((a, b) => (b.stats?.last_at ?? "").localeCompare(a.stats?.last_at ?? "") || a.name.localeCompare(b.name));
  }, [summary, projects, project]);

  const t = summary?.totals;
  const spark14 = (rows: { day: string; pulls: number }[]) => fillDays(rows, Math.min(14, days)).map((d) => d.value);

  return (
    <section className="list-pane" aria-labelledby="activity-title">
      <header className="page-head">
        <div className="grow">
          <div className="eyebrow">Vault</div>
          <h1 id="activity-title">Activity</h1>
          <p className="page-sub">
            Who pulled which project, read a secret or changed something, and from where. Kept for 90 days; secret values are never logged.
          </p>
        </div>
      </header>

      {/* One filter row scopes everything below it. */}
      <div className="list-toolbar">
        <Seg<Range> label="Range" value={range} onChange={setRange} options={[["7", "7 days"], ["30", "30 days"], ["90", "90 days"]]} />
        <label className="sort">
          <span className="muted sort-label">Project</span>
          <select className="select mono" aria-label="Project" value={project} onChange={(e) => setProject(e.target.value)}>
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </label>
        {client && (
          <button type="button" className="chip" aria-pressed="true" onClick={() => setClient("")} title="Clear the client filter">
            {client} <Icon name="x" size={12} />
          </button>
        )}
        <span className="grow hide-phone" />
        <Button size="sm" variant="ghost" onClick={load}>Refresh</Button>
      </div>

      <div className="list-scroll">
        {error && <ErrorBanner onRetry={load}>Couldn’t load activity: {error}</ErrorBanner>}
        {/* A refetch keeps the previous numbers on screen, dimmed, instead of flashing a skeleton. */}
        <div className={"activity" + (loading && summary ? " refreshing" : "")} aria-busy={loading}>
          {!summary ? (
            <p className="muted">Loading…</p>
          ) : (
            <>
              <div className="kpis">
                <StatTile
                  label={`Pulls, last ${days} days`}
                  value={t!.pulls.toLocaleString()}
                  trend={<Sparkline values={daily.slice(-14).map((d) => d.value)} label="Pulls, last 14 days" />}
                />
                <StatTile label="Pulls, last 24 hours" value={t!.pulls_24h.toLocaleString()} />
                <StatTile label="Clients pulling" value={t!.clients.toLocaleString()} note="servers, CI jobs and laptops" />
                <StatTile label="Secrets read" value={t!.reads.toLocaleString()} note="reveals, copies, token views" />
                <StatTile label="Changes" value={t!.writes.toLocaleString()} />
                <StatTile
                  label="Failed sign-ins"
                  value={t!.failures.toLocaleString()}
                  tone={t!.failures > 0 ? "danger" : undefined}
                  note={t!.failures > 0 ? <><Icon name="alert" size={12} /> wrong password or token</> : "none"}
                />
              </div>

              <section className="section">
                <div className="section-head">
                  <h2 className="section-title grow">Pulls per day{project && <> · <span className="mono">{project}</span></>}</h2>
                  <Button size="sm" variant="ghost" aria-pressed={showTable} onClick={() => setShowTable((s) => !s)}>
                    {showTable ? "Show chart" : "Show table"}
                  </Button>
                </div>
                {showTable ? (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead><tr><th>Day</th><th className="num">Pulls</th></tr></thead>
                      <tbody>
                        {[...daily].reverse().map((d) => <tr key={d.key}><td>{d.label}</td><td className="num">{d.value}</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                ) : t!.pulls === 0 ? (
                  <EmptyState title="No pulls in this range">
                    A pull is any <span className="mono">envvault run</span>, <span className="mono">get</span> or <span className="mono">list</span>, or a
                    call to <span className="mono">/api/projects/NAME/env</span>. Give each server a name with{" "}
                    <span className="mono">ENV_VAULT_CLIENT=cheat-sheet-prod</span> so you can tell them apart here.
                  </EmptyState>
                ) : (
                  <ColumnChart data={daily} unit="pulls" />
                )}
              </section>

              <section className="section">
                <h2 className="section-title">Heartbeat per project</h2>
                <p className="field-hint">Every <span className="mono">envvault run</span> (a server starting, a deploy, a CI job) is a beat.</p>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr><th>Project</th><th>Status</th><th>Last pull</th><th className="num">Pulls</th><th className="num">24h</th><th className="num">Clients</th><th>Last {Math.min(14, days)} days</th></tr>
                    </thead>
                    <tbody>
                      {heartbeat.map(({ name, stats, known }) => {
                        const pulse = pulseOf(stats?.last_at);
                        return (
                          <tr key={name}>
                            <td>
                              {known ? <button type="button" className="link mono" onClick={() => onOpenProject(name)}>{name}</button> : <span className="mono">{name}</span>}
                            </td>
                            <td><span className={`pulse pulse-${pulse}`} title={PULSE_LABEL[pulse].hint}>{PULSE_LABEL[pulse].mark} {PULSE_LABEL[pulse].label}</span></td>
                            <td>
                              {stats ? (
                                <>
                                  <time dateTime={stats.last_at} title={longDate(stats.last_at)}>{ago(stats.last_at)}</time>
                                  <span className="muted small"> by </span>
                                  <button type="button" className="link small" onClick={() => setClient(stats.last_client)}>{stats.last_client || "unknown"}</button>
                                  {stats.last_branch && <span className="muted small mono"> -b {stats.last_branch}</span>}
                                </>
                              ) : (
                                <span className="muted">never in this range</span>
                              )}
                            </td>
                            <td className="num">{stats?.pulls ?? 0}</td>
                            <td className="num">{stats?.pulls_24h ?? 0}</td>
                            <td className="num">{stats?.clients ?? 0}</td>
                            <td><Sparkline values={spark14(stats?.daily ?? [])} label={`${name} pulls per day`} /></td>
                          </tr>
                        );
                      })}
                      {heartbeat.length === 0 && <tr><td colSpan={7} className="muted">No projects yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="section">
                <h2 className="section-title">Who pulls what</h2>
                <p className="field-hint">Clients using the API token, named by <span className="mono">ENV_VAULT_CLIENT</span>, else their hostname, else their IP.</p>
                {summary.clients.length ? (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr><th>Client</th><th>Runs on</th><th>From</th><th>Projects</th><th className="num">Pulls</th><th>Last seen</th></tr>
                      </thead>
                      <tbody>
                        {summary.clients.map((c) => (
                          <tr key={c.client}>
                            <td><button type="button" className="link mono" onClick={() => setClient(c.client)}>{c.client}</button></td>
                            <td className="small">{c.ci || c.host || <span className="muted">{c.user_agent || "—"}</span>}</td>
                            <td className="small mono">{whereOf(c) || "—"}</td>
                            <td><div className="tag-row">{c.projects.map((p) => <Tag key={p} mono>{p}</Tag>)}</div></td>
                            <td className="num">{c.pulls}</td>
                            <td><time dateTime={c.last_at} title={longDate(c.last_at)}>{ago(c.last_at)}</time></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted small">No API-token clients in this range.</p>
                )}
              </section>

              <section className="section">
                <div className="section-head">
                  <h2 className="section-title grow">Event log</h2>
                </div>
                <div className="hide-phone">
                  <Seg label="Show" size="sm" value={group} onChange={setGroup} options={KIND_GROUPS.map(([id, label]) => [id, label] as [string, string])} />
                </div>
                <select className="select phone-only" aria-label="Show" value={group} onChange={(e) => setGroup(e.target.value)}>
                  {KIND_GROUPS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
                {events && events.length ? (
                  <ol className="event-list">
                    {events.map((e) => (
                      <li key={e.id} className={"event" + (e.kind === "auth_failed" || e.kind === "login_failed" ? " event-fail" : "")}>
                        <details>
                          <summary>
                            <span className="type-code">[{KIND_CODES[e.kind]}]</span>
                            <span className="event-what grow">{describe(e)}</span>
                            <span className="event-who small">{whoOf(e)}</span>
                            <time className="event-at small muted" dateTime={e.at} title={longDate(e.at)}>{ago(e.at)}</time>
                          </summary>
                          <dl className="details details-tight event-details">
                            <dt>When</dt><dd>{longDate(e.at)}</dd>
                            <dt>Who</dt><dd className="mono">{whoOf(e)}{e.host && e.host !== e.who ? ` (host ${e.host})` : ""}</dd>
                            {e.ci && (<><dt>Runs on</dt><dd className="mono">{e.ci}</dd></>)}
                            {e.command && (<><dt>Command</dt><dd className="mono">envvault {e.command}</dd></>)}
                            <dt>From</dt><dd className="mono">{whereOf(e) || "—"}{e.city ? ` · ${e.city}` : ""}{e.colo ? ` · via ${e.colo}` : ""}</dd>
                            <dt>Request</dt><dd className="mono">{e.method} {e.path} → {e.status}</dd>
                            <dt>Auth</dt><dd>{e.auth === "bearer" ? "API token" : e.auth === "session" ? "Dashboard session" : "None"}</dd>
                            {e.user_agent && (<><dt>Agent</dt><dd className="mono small">{e.user_agent}</dd></>)}
                          </dl>
                        </details>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="muted small">Nothing logged for this filter yet.</p>
                )}
                {next && <div><Button size="sm" onClick={loadMore}>Load older events</Button></div>}
              </section>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/** A project's heartbeat for its Overview: when it was last pulled, by whom, and the latest events. */
export function ProjectHeartbeat({ project, onOpenActivity, onUnauthorized }: { project: Project; onOpenActivity: () => void; onUnauthorized: () => void }) {
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [events, setEvents] = useState<AccessEvent[]>([]);
  const unauthorized = useRef(onUnauthorized);
  unauthorized.current = onUnauthorized;

  useEffect(() => {
    let live = true;
    Promise.all([api.activitySummary(30, project.name), api.activity({ project: project.name, limit: 5 })]).then(
      ([s, ev]) => live && (setSummary(s), setEvents(ev.events)),
      (e) => e instanceof UnauthorizedError && unauthorized.current(),
    );
    return () => {
      live = false;
    };
  }, [project.name]);

  const stats = summary?.projects.find((p) => p.project === project.name) ?? null;
  const pulse = pulseOf(stats?.last_at);
  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title grow">Heartbeat</h2>
        <Button size="sm" variant="ghost" onClick={onOpenActivity}>All activity</Button>
      </div>
      {!summary ? (
        <p className="muted small">Loading…</p>
      ) : stats ? (
        <>
          <p>
            <span className={`pulse pulse-${pulse}`} title={PULSE_LABEL[pulse].hint}>{PULSE_LABEL[pulse].mark} {PULSE_LABEL[pulse].label}</span>{" "}
            · last pulled <time dateTime={stats.last_at} title={longDate(stats.last_at)}>{ago(stats.last_at)}</time> by{" "}
            <span className="mono">{stats.last_client || "unknown"}</span>
            {stats.last_branch && <span className="mono"> -b {stats.last_branch}</span>}
            {(stats.last_ip || stats.last_country) && <span className="muted small"> from {[stats.last_ip, stats.last_country].filter(Boolean).join(" · ")}</span>}
          </p>
          <div className="heartbeat-row">
            <Sparkline values={fillDays(stats.daily, 14).map((d) => d.value)} label="Pulls per day, last 14 days" />
            <span className="muted small">{stats.pulls} pulls in 30 days · {stats.pulls_24h} today · {stats.clients} clients</span>
          </div>
        </>
      ) : (
        <p className="muted">
          Nothing has pulled {project.name} in the last 30 days. Once a server runs{" "}
          <span className="mono">ENV_VAULT_CLIENT=my-server envvault run {project.name} -- …</span>, it shows up here.
        </p>
      )}
      {events.length > 0 && (
        <ol className="event-list event-list-compact">
          {events.map((e) => (
            <li key={e.id} className={"event" + (e.kind === "auth_failed" ? " event-fail" : "")}>
              <div className="event-line">
                <span className="type-code">[{KIND_CODES[e.kind]}]</span>
                <span className="event-what grow">{describe(e)}</span>
                <span className="event-who small">{whoOf(e)}</span>
                <time className="event-at small muted" dateTime={e.at} title={longDate(e.at)}>{ago(e.at)}</time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
