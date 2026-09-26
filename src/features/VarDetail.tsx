import type { Var } from "../lib/api";
import { CLIPBOARD_CLEAR_SECONDS, useSettings } from "../lib/settings";
import { longDate } from "../lib/format";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { SecretField } from "../ui/SecretField";
import { Tag } from "../ui/Tag";

interface Props {
  v: Var;
  fetchValue: () => Promise<string>;
  onCopy: (value: string) => Promise<void> | void;
  onEdit: () => void;
  onDelete: () => void;
}

function Body({ v, fetchValue, onCopy }: Props) {
  const [settings] = useSettings();
  return (
    <div className="detail-body">
      <div>
        <div className="detail-label">Value</div>
        {/* keyed by var: switching items drops any revealed value */}
        <SecretField
          key={v.key}
          label={v.key}
          fetchValue={fetchValue}
          onCopy={onCopy}
          note={settings.clipboardClear ? `Copied values clear from your clipboard after ${CLIPBOARD_CLEAR_SECONDS}s.` : undefined}
        />
      </div>
      {v.shared && (
        <div className="callout">
          <strong>Used by {v.projects.length} projects.</strong> Saving a change here updates{" "}
          {v.projects.map((p, i) => (
            <span key={p}>{i > 0 && (i === v.projects.length - 1 ? " and " : ", ")}<span className="mono">{p}</span></span>
          ))}{" "}
          on their next run.
        </div>
      )}
      <dl className="details">
        <dt>Projects</dt>
        <dd className="tag-row">{v.projects.length ? v.projects.map((p) => <Tag key={p} mono>{p}</Tag>) : "Personal (no project)"}</dd>
        <dt>Changed</dt>
        <dd>{longDate(v.updated_at)}</dd>
      </dl>
    </div>
  );
}

function Actions({ onEdit, onDelete }: Pick<Props, "onEdit" | "onDelete">) {
  return (
    <>
      <Button variant="primary" size="lg" className="grow" onClick={onEdit}>Edit</Button>
      <Button variant="danger" size="lg" onClick={onDelete}>Delete</Button>
    </>
  );
}

function Eyebrow({ v }: { v: Var }) {
  return (
    <span className="eyebrow-row">
      <span className="eyebrow accent">Variable</span>
      {v.shared && <Tag tone="accent">shared · {v.projects.length} projects</Tag>}
    </span>
  );
}

/** Right-hand detail pane (≥1440px). */
export function DetailPane(props: Props) {
  return (
    <aside className="detail-pane" aria-labelledby="detail-title">
      <header className="detail-head">
        <Eyebrow v={props.v} />
        <h2 id="detail-title" className="detail-title mono">{props.v.key}</h2>
      </header>
      <Body {...props} />
      <footer className="detail-foot"><Actions {...props} /></footer>
    </aside>
  );
}

/** The same detail as a dialog (a bottom sheet on phones) below 1440px. */
export function DetailDialog(props: Props & { onClose: () => void }) {
  return (
    <Dialog
      eyebrow={<Eyebrow v={props.v} />}
      title={<span className="mono break">{props.v.key}</span>}
      onClose={props.onClose}
      width={520}
      footer={<Actions {...props} />}
    >
      <Body {...props} />
    </Dialog>
  );
}

export function EmptyDetail() {
  return (
    <aside className="detail-pane detail-empty">
      <p className="muted">Select an item to see its value and details.</p>
      <p className="muted small">
        <kbd>j</kbd> <kbd>k</kbd> move · <kbd>↵</kbd> open · <kbd>c</kbd> copy · <kbd>?</kbd> shortcuts
      </p>
    </aside>
  );
}
