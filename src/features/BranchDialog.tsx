import { useState } from "react";
import { api, type Branch, type Project } from "../lib/api";
import { BRANCH_RE } from "../lib/format";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { Field } from "../ui/Field";
import { useToast } from "../ui/Toast";

interface Props {
  project: Project;
  /** null adds a new branch. */
  editing: Branch | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export function BranchDialog({ project, editing, onClose, onSaved }: Props) {
  const toast = useToast();
  const [name, setName] = useState(editing?.name ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [error, setError] = useState("");
  const renaming = !!editing && name.trim() !== editing.name;

  const save = async () => {
    const n = name.trim();
    if (!BRANCH_RE.test(n) || n.includes("..")) return setError("Letters, numbers and . _ / - (like main or feature/login).");
    try {
      if (editing) await api.updateBranch(editing.id, { name: n, notes });
      else await api.addBranch(project.id, n, notes);
      onClose();
      toast(editing ? `Saved ${n}` : `Added branch ${n}`);
      await onSaved();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Dialog
      eyebrow={<>Branch · <span className="mono">{project.name}</span></>}
      title={editing ? <>Edit <span className="mono">{editing.name}</span></> : "New branch"}
      onClose={onClose}
      width={520}
      footer={
        <>
          <Button type="submit" form="branch-form" variant="primary" size="lg" className="grow" onClick={save}>
            {editing ? "Save changes" : "Add branch"}
          </Button>
          <Button size="lg" onClick={onClose}>Cancel</Button>
        </>
      }
    >
      <form id="branch-form" className="form" onSubmit={(e) => e.preventDefault()}>
        <Field label="Name" htmlFor="branch-name" hint={<>Usually your git branch. CI runs <span className="mono">envvault run {project.name} -b {name.trim() || "main"} -- …</span></>}>
          <input id="branch-name" className="input input-lg mono" placeholder="main" autoComplete="off" spellCheck={false} autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        {renaming && (
          <div className="callout">
            <strong>Renaming changes the -b name.</strong> CI using <span className="mono">-b {editing.name}</span> must switch to the new name.
          </div>
        )}
        <Field label="Notes" htmlFor="branch-notes">
          <textarea id="branch-notes" className="input" rows={3} placeholder="Production · deploys to Cloudflare on push" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        {error && <div className="field-error" role="alert">{error}</div>}
      </form>
    </Dialog>
  );
}
