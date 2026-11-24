import { useEffect, useState } from "react";
import { api, type Project, type Var } from "../lib/api";
import { KEY_RE } from "../lib/format";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { Field } from "../ui/Field";
import { useToast } from "../ui/Toast";

interface Props {
  editing: Var | null;
  /** Every variable, so a new one can't silently replace an existing one. */
  vars: Var[];
  projects: Project[];
  /** Pre-selected project (by name) when adding from a project page. */
  defaultProject?: string | null;
  onClose: () => void;
  onSaved: (id: string) => Promise<void>;
}

export function VarDialog({ editing, vars, projects, defaultProject, onClose, onSaved }: Props) {
  const toast = useToast();
  const [key, setKey] = useState(editing?.key ?? "");
  // Editing loads the current value only while this dialog is open.
  const [value, setValue] = useState<string | null>(editing ? null : "");
  // "" is personal (no project).
  const [projectId, setProjectId] = useState<string>(
    () => (editing ? editing.project_id : projects.find((p) => p.name === defaultProject)?.id) ?? "",
  );
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing) return;
    let live = true;
    api.getValue(editing.id).then(
      (v) => live && setValue(v),
      (e: Error) => live && (setError(e.message), setValue("")),
    );
    return () => {
      live = false;
    };
  }, [editing]);

  const save = async () => {
    const k = key.trim();
    if (!KEY_RE.test(k)) {
      setError("Use letters, numbers and underscores, not starting with a number (like DATABASE_URL).");
      return;
    }
    const pid = projectId || null;
    const taken = vars.find((v) => v.key === k && v.project_id === pid && v.id !== editing?.id);
    if (taken) {
      setError(`${k} already exists ${taken.project ? `in ${taken.project}` : "as a personal variable"}. Edit that one instead.`);
      return;
    }
    try {
      const { id } = editing
        ? await api.updateVar(editing.id, { key: k, value: value ?? "", notes, project_id: pid })
        : await api.saveVar(k, value ?? "", pid, notes);
      onClose();
      toast(`Saved ${k}`);
      await onSaved(id);
    } catch (e) {
      setError((e as Error).message);
    }
  };

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
        <Field
          label="Key"
          htmlFor="var-key"
          hint={editing && key.trim() !== editing.key ? "Renaming: this project’s branch overrides move to the new key, so apps must read the new name." : "Letters, numbers and underscores."}
        >
          <input
            id="var-key"
            className="input input-lg mono"
            placeholder="DATABASE_URL"
            autoComplete="off"
            spellCheck={false}
            autoFocus={!editing}
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
        <Field label="Notes" htmlFor="var-notes" hint="Where it comes from, when to rotate it. Plain text, not encrypted.">
          <textarea id="var-notes" className="input" rows={2} placeholder="Neon → my-api → Connection string (pooled)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Field
          label="Project"
          htmlFor="var-project"
          hint={projects.length ? "Each project has its own variables. Other projects can use the same key with a different value." : "No projects yet. It’s saved as a personal variable."}
        >
          <select id="var-project" className="select input-lg" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Personal (no project)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>
        {error && <div className="field-error" role="alert">{error}</div>}
      </form>
    </Dialog>
  );
}
