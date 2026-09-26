import { useState } from "react";
import { api, type Project, type Service, type ServiceInput } from "../lib/api";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { useToast } from "../ui/Toast";
import { EMPTY_SERVICE, ServiceFields, serviceInput } from "./ServiceFields";

interface Props {
  project: Project;
  /** null adds a new service. */
  editing: Service | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export function ServiceDialog({ project, editing, onClose, onSaved }: Props) {
  const toast = useToast();
  const [value, setValue] = useState<ServiceInput>(editing ? serviceInput(editing) : { ...EMPTY_SERVICE });
  const [error, setError] = useState("");

  const save = async () => {
    if ((!value.kind.trim() || value.kind === "other") && !value.provider.trim()) return setError("Pick what it is or who provides it, like Database / Neon.");
    try {
      if (editing) await api.updateService(editing.id, value);
      else await api.addService(project.id, value);
      onClose();
      toast(editing ? "Saved service" : "Added service");
      await onSaved();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Dialog
      eyebrow={<>Service · <span className="mono">{project.name}</span></>}
      title={editing ? "Edit service" : "Add a service"}
      onClose={onClose}
      width={640}
      footer={
        <>
          <Button type="submit" form="service-form" variant="primary" size="lg" className="grow" onClick={save}>
            {editing ? "Save changes" : "Add service"}
          </Button>
          <Button size="lg" onClick={onClose}>Cancel</Button>
        </>
      }
    >
      <form id="service-form" className="form" onSubmit={(e) => e.preventDefault()}>
        <p className="field-hint">
          Where this project lives and what it depends on: the database on Neon, hosting on Cloudflare, email on Resend. Stored as
          plain text, so put passwords and keys in variables.
        </p>
        <ServiceFields value={value} onChange={setValue} keys={project.keys} />
        {error && <div className="field-error" role="alert">{error}</div>}
      </form>
    </Dialog>
  );
}
