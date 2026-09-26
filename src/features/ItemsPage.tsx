import { useState } from "react";
import { api, owners, type Item, type ItemType } from "../lib/api";
import { hostOf, longDate, shortAge } from "../lib/format";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { EmptyState, ErrorBanner, SkeletonRows } from "../ui/EmptyState";
import { Highlight } from "../ui/Highlight";
import { Icon } from "../ui/Icon";
import { SecretField } from "../ui/SecretField";
import { Seg } from "../ui/Seg";
import { Tag } from "../ui/Tag";
import { HistoryList } from "./HistoryList";
import { ITEM_LABELS } from "./ItemDialog";
import { ExtLink, ITEM_CODES } from "./ProjectPages";
import { useCopy } from "./useCopy";

type TypeFilter = ItemType | "all";

interface Props {
  items: Item[] | null; // null while loading
  loadError: string | null;
  onRetry: () => void;
  type: ItemType | null;
  onType: (t: ItemType | null) => void;
  onNew: (t: ItemType) => void;
  onOpen: (id: string) => void;
  onCopy: (id: string) => void;
}

function metaLine(it: Item): string {
  if (it.type === "login") return [it.username, it.url && hostOf(it.url)].filter(Boolean).join(" · ") || "Login";
  return it.notes ? it.notes.split("\n")[0] : ITEM_LABELS[it.type].one;
}

/** The personal vault: logins, secure notes and secrets that aren't a project's environment. */
export function ItemsPage({ items, loadError, onRetry, type, onType, onNew, onOpen, onCopy }: Props) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const all = items ?? [];
  const shown = all.filter(
    (it) =>
      (!type || it.type === type) &&
      (!q || [it.title, it.username, it.url, it.notes, it.project ?? ""].some((s) => s.toLowerCase().includes(q))),
  );
  const count = (t: ItemType) => all.filter((it) => it.type === t).length;
  const heading = type ? ITEM_LABELS[type].many : "Personal vault";

  return (
    <section className="list-pane" aria-labelledby="items-title">
      <header className="page-head">
        <div className="grow">
          <div className="eyebrow">Personal</div>
          <h1 id="items-title">{heading}</h1>
          <p className="page-sub">Your own logins, notes and keys. Encrypted like every variable, and only fetched when you reveal or copy one.</p>
        </div>
        <Button variant="primary" className="new-btn" trailing={<Icon name="plus" size={15} />} onClick={() => onNew(type ?? "login")}>
          New {ITEM_LABELS[type ?? "login"].one.toLowerCase()}
        </Button>
      </header>

      <div className="list-toolbar">
        <div className="search">
          <Icon name="search" size={15} />
          <input className="input" type="search" aria-label="Filter by title, username, site or notes" placeholder="filter…" value={query}
            onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setQuery("")} />
        </div>
        <Seg<TypeFilter>
          label="Type"
          value={type ?? "all"}
          onChange={(t) => onType(t === "all" ? null : t)}
          options={[["all", `All · ${all.length}`], ["login", `Logins · ${count("login")}`], ["note", `Notes · ${count("note")}`], ["secret", `Secrets · ${count("secret")}`]]}
        />
        {/* Phones hide the segment (see .list-toolbar .seg), so they get a dropdown instead. */}
        <div className="list-selects list-selects-single">
          <select className="select phone-only" aria-label="Type" value={type ?? "all"} onChange={(e) => onType(e.target.value === "all" ? null : (e.target.value as ItemType))}>
            <option value="all">Show: All · {all.length}</option>
            <option value="login">Show: Logins · {count("login")}</option>
            <option value="note">Show: Notes · {count("note")}</option>
            <option value="secret">Show: Secrets · {count("secret")}</option>
          </select>
        </div>
      </div>

      <div className="list-cols" aria-hidden="true">
        <span>Type</span><span>Title</span><span>Project</span><span className="right">Changed</span>
      </div>
      <div className="list-scroll">
        {loadError && <ErrorBanner onRetry={onRetry}>Couldn’t load your items: {loadError}</ErrorBanner>}
        {items === null ? (
          <SkeletonRows />
        ) : shown.length ? (
          <ul className="rows rows-long-codes" aria-label={`${shown.length} items`}>
            {shown.map((it) => (
              <li key={it.id} className="row">
                <button type="button" className="row-main" onClick={() => onOpen(it.id)}>
                  <span className="type-code">[{ITEM_CODES[it.type]}]</span>
                  <span className="row-name">
                    <span className="row-key"><Highlight text={it.title} query={query} /></span>
                    <span className="row-meta">{metaLine(it)}</span>
                  </span>
                  <span className="row-tags">{it.project ? <Tag mono>{it.project}</Tag> : <span className="muted small">Personal</span>}</span>
                  <time className="row-age" dateTime={it.updated_at} title={longDate(it.updated_at)}>{shortAge(it.updated_at)}</time>
                </button>
                <button type="button" className="btn btn-icon btn-lg row-copy" aria-label={`Copy ${ITEM_LABELS[it.type].value.toLowerCase()} of ${it.title}`}
                  onClick={() => onCopy(it.id)}>
                  <Icon name="copy" size={16} />
                </button>
              </li>
            ))}
          </ul>
        ) : all.length === 0 ? (
          <EmptyState
            title="Your personal vault is empty."
            actions={
              <>
                <Button variant="primary" onClick={() => onNew("login")}>Add a login</Button>
                <Button onClick={() => onNew("note")}>Write a secure note</Button>
                <Button onClick={() => onNew("secret")}>Store a secret</Button>
              </>
            }
          >
            Keep what isn’t a project’s environment here too: dashboard logins, recovery codes, license keys, personal API keys.
            Link any of them to a project to see them on its Overview.
          </EmptyState>
        ) : (
          <EmptyState
            title={q ? <>Nothing matches ‘{query}’</> : `No ${heading.toLowerCase()} yet`}
            actions={q ? <button type="button" className="link" onClick={() => setQuery("")}>Clear search</button> : <Button variant="primary" onClick={() => onNew(type ?? "login")}>Add one</Button>}
          >
            {q ? "Search looks at titles, usernames, sites, notes and project names, never values." : ITEM_LABELS[type ?? "login"].hint}
          </EmptyState>
        )}
      </div>
    </section>
  );
}

interface DetailProps {
  item: Item;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenProject: (name: string) => void;
  onRestored: () => Promise<void>;
  onUnauthorized: () => void;
}

export function ItemDetailDialog({ item, onClose, onEdit, onDelete, onOpenProject, onRestored, onUnauthorized }: DetailProps) {
  const copy = useCopy();
  const labels = ITEM_LABELS[item.type];
  return (
    <Dialog
      eyebrow={<span className="eyebrow-row"><span className="eyebrow accent">{labels.one}</span>{item.project && <Tag mono>{item.project}</Tag>}</span>}
      title={item.title}
      onClose={onClose}
      width={560}
      footer={
        <>
          <Button variant="primary" size="lg" className="grow" onClick={onEdit}>Edit</Button>
          <Button variant="danger" size="lg" onClick={onDelete}>Delete</Button>
        </>
      }
    >
      <div className="detail-body">
        {item.type === "login" && (item.url || item.username) && (
          <dl className="details">
            {item.url && (<><dt>Website</dt><dd><ExtLink url={item.url} label={hostOf(item.url)} /></dd></>)}
            {item.username && (
              <>
                <dt>Username</dt>
                <dd className="inline-copy">
                  <span className="mono break">{item.username}</span>
                  <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Copy username" onClick={() => copy(item.username, "username")}>
                    <Icon name="copy" size={14} />
                  </button>
                </dd>
              </>
            )}
          </dl>
        )}
        <div>
          <div className="detail-label">{labels.value}</div>
          <SecretField key={`${item.id}:${item.updated_at}`} label={`${item.title} ${labels.value.toLowerCase()}`} fetchValue={() => api.getItemValue(item.id)}
            onCopy={(value) => copy(value, `${item.title} ${labels.value.toLowerCase()}`, true)} />
        </div>
        <div>
          <div className="detail-label">Notes</div>
          {item.notes ? <p className="notes-text">{item.notes}</p> : <p className="muted small">No notes.</p>}
        </div>
        <dl className="details">
          <dt>Project</dt>
          <dd>{item.project ? <button type="button" className="link mono" onClick={() => onOpenProject(item.project!)}>{item.project}</button> : "Personal (no project)"}</dd>
          <dt>Changed</dt>
          <dd>{longDate(item.updated_at)}</dd>
        </dl>
        <HistoryList owner={owners.item(item.id)} label={item.title} version={item.updated_at} onRestored={onRestored} onUnauthorized={onUnauthorized} />
      </div>
    </Dialog>
  );
}
