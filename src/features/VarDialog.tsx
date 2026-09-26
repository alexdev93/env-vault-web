import { useEffect, useState } from "react";
import { api, type Project, type Var } from "../lib/api";
import { KEY_RE } from "../lib/format";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { Field } from "../ui/Field";
import { useToast } from "../ui/Toast";

interface Props {
  editing: Var | null;
  projects: Project[];
  /** Pre-ticked project when adding from a project page. */
  defaultProject?: string | null;
  onClose: () => void;
  onSaved: (key: string) => Promise<void>;
}

export function VarDialog({ editing, projects, defaultProject, onClose, onSaved }: Props) {
  const toast = useToast();
  const [key, setKey] = useState(editing?.key ?? "");
  // Editing loads the current value only while this dialog is open.
  const [value, setValue] = useState<string | null>(editing ? null : "");
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(projects.filter((p) => (editing ? editing.projects.includes(p.name) : p.name === defaultProject)).map((p) => p.id)),
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing) return;
    let live = true;
    api.getValue(editing.key).then(
      (v) => live && setValue(v),
      (e: Error) => live && (setError(e.message), setValue("")),
    );
    return () => {
      live = false;
    };
  }, [editing]);

  const toggle = (id: string) =>
    setChecked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const save = async () => {
    const k = key.trim();
    if (!KEY_RE.test(k)) {
      setError("Use letters, numbers and underscores, not starting with a number (like DATABASE_URL).");
      return;
    }
    try {
      await api.saveVar(k, value ?? "", [...checked]);
      onClose();
      toast(`Saved ${k}`);
      await onSaved(k);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const sharedNames = projects.filter((p) => checked.has(p.id)).map((p) => p.name);

  return (
    <Dialog
      eyebrow="Variable"
      title={editing ? <>Edit <span className="mono">{editing.key}</span></> : "New variable"}
      onClose={onClose}
      width={560}
      footer={
        <>
          <Button type="submit" form="var-form" variant="primary" size="lg" className="grow" onClick={save} disabled={value === null}>
            {editing ? "Save changes" : "Save variable"}
          </Button>
          <Button size="lg" onClick={onClose}>Cancel</Button>
        </>
      }
    >
      <form id="var-form" className="form" onSubmit={(e) => e.preventDefault()}>
        <Field label="Key" htmlFor="var-key" hint={editing ? "Renaming comes in a later update." : "Letters, numbers and underscores."}>
          <input
            id="var-key"
            className="input input-lg mono"
            placeholder="DATABASE_URL"
            autoComplete="off"
            spellCheck={false}
            autoFocus={!editing}
            disabled={!!editing}
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
        </Field>
        <Field label="Value" htmlFor="var-value">
          <textarea
            id="var-value"
            className="input mono"
            placeholder={value === null ? "Loading…" : "The real value"}
            autoComplete="off"
            spellCheck={false}
            autoFocus={!!editing}
            disabled={value === null}
            rows={4}
            value={value ?? ""}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
        <fieldset className="field">
          <legend className="field-label">Used by which projects?</legend>
          {projects.length ? (
            <div className="checks">
              {projects.map((p) => (
                <label key={p.id} className="check">
                  <input type="checkbox" checked={checked.has(p.id)} onChange={() => toggle(p.id)} />
                  <span className="mono">{p.name}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="field-hint">No projects yet. It’s saved as a personal item.</p>
          )}
        </fieldset>
        {sharedNames.length > 1 && (
          <div className="callout">
            <strong>Shared by {sharedNames.length} projects.</strong> Saving updates every one of them on its next run.
          </div>
        )}
        {error && <div className="field-error" role="alert">{error}</div>}
      </form>
    </Dialog>
  );
}
