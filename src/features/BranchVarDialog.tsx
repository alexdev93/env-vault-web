import { useEffect, useId, useState } from "react";
import { api, type Branch, type BranchVar, type Project } from "../lib/api";
import { KEY_RE } from "../lib/format";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { Field } from "../ui/Field";
import { useToast } from "../ui/Toast";

interface Props {
  project: Project;
  branch: Branch;
  /** null adds a new branch variable. */
  editing: BranchVar | null;
  /** Pre-filled key for a new override ("Override on main"). */
  initialKey?: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

/** A value for one branch only. Same key as a project default overrides it on that branch. */
export function BranchVarDialog({ project, branch, editing, initialKey, onClose, onSaved }: Props) {
  const toast = useToast();
  const listId = useId();
  const [key, setKey] = useState(editing?.key ?? initialKey ?? "");
  // Editing loads the current value only while this dialog is open.
  const [value, setValue] = useState<string | null>(editing ? null : "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing) return;
    let live = true;
    api.getBranchValue(branch.id, editing.key).then(
      (v) => live && setValue(v),
      (e: Error) => live && (setError(e.message), setValue("")),
    );
    return () => {
      live = false;
    };
  }, [editing, branch.id]);

  const k = key.trim();
  const overrides = project.keys.includes(k);

  const save = async () => {
    if (!KEY_RE.test(k)) return setError("Use letters, numbers and underscores, not starting with a number (like DATABASE_URL).");
    try {
      if (editing) await api.updateBranchVar(branch.id, editing.key, { key: k, value: value ?? "", notes });
      else await api.saveBranchVar(branch.id, { key: k, value: value ?? "", notes });
      onClose();
      toast(`Saved ${k} on ${branch.name}`);
      await onSaved();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Dialog
      eyebrow={<>Branch variable · <span className="mono">{project.name} -b {branch.name}</span></>}
      title={editing ? <>Edit <span className="mono">{editing.key}</span></> : "New branch variable"}
      onClose={onClose}
      width={560}
      footer={
        <>
          <Button type="submit" form="branch-var-form" variant="primary" size="lg" className="grow" onClick={save} disabled={value === null}>
            {editing ? "Save changes" : "Save variable"}
          </Button>
          <Button size="lg" onClick={onClose}>Cancel</Button>
        </>
      }
    >
      <form id="branch-var-form" className="form" onSubmit={(e) => e.preventDefault()}>
        <Field label="Key" htmlFor="bvar-key" hint="Pick a project default to override it, or type a new key for this branch only.">
          <input id="bvar-key" className="input input-lg mono" list={listId} placeholder="DATABASE_URL" autoComplete="off" spellCheck={false} autoFocus={!editing && !initialKey} value={key} onChange={(e) => setKey(e.target.value)} />
          <datalist id={listId}>{project.keys.map((pk) => <option key={pk} value={pk} />)}</datalist>
        </Field>
        {k && KEY_RE.test(k) && (
          <div className="callout">
            {overrides ? (
              <><strong>Overrides the default.</strong> On <span className="mono">{branch.name}</span> this replaces the project’s <span className="mono">{k}</span>; other branches keep the default.</>
            ) : (
              <><strong>Branch only.</strong> Only <span className="mono">-b {branch.name}</span> gets <span className="mono">{k}</span>.</>
            )}
          </div>
        )}
        <Field label="Value" htmlFor="bvar-value">
          <textarea id="bvar-value" className="input mono" placeholder={value === null ? "Loading…" : "The value for this branch"} autoComplete="off" spellCheck={false} autoFocus={!!editing || !!initialKey} disabled={value === null} rows={4} value={value ?? ""} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <Field label="Notes" htmlFor="bvar-notes">
          <textarea id="bvar-notes" className="input" rows={2} placeholder="Neon branch “production”" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        {error && <div className="field-error" role="alert">{error}</div>}
      </form>
    </Dialog>
  );
}
