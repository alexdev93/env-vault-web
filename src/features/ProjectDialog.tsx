import { useState } from "react";
import { api } from "../lib/api";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { Field } from "../ui/Field";
import { useToast } from "../ui/Toast";

export function ProjectDialog({ onClose, onSaved }: { onClose: () => void; onSaved: (name: string) => Promise<void> }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const save = async () => {
    const n = name.trim().toLowerCase();
    try {
      await api.createProject(n, description.trim());
      onClose();
      toast(`Created ${n}`);
      await onSaved(n);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Dialog
      eyebrow="Project"
      title="New project"
      onClose={onClose}
      width={480}
      footer={
        <>
          <Button type="submit" form="project-form" variant="primary" size="lg" className="grow" onClick={save}>Create project</Button>
          <Button size="lg" onClick={onClose}>Cancel</Button>
        </>
      }
    >
      <form id="project-form" className="form" onSubmit={(e) => e.preventDefault()}>
        <Field label="Name" htmlFor="proj-name" hint="Lowercase letters, numbers and hyphens. The CLI uses it: envvault run my-api" error={error || undefined}>
          <input id="proj-name" className="input input-lg mono" placeholder="my-api" autoComplete="off" spellCheck={false} autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Description (optional)" htmlFor="proj-desc">
          <input id="proj-desc" className="input input-lg" placeholder="Express API on Fly.io" autoComplete="off" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </form>
    </Dialog>
  );
}
