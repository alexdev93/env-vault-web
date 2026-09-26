import { useState } from "react";
import { api, type Project, type ProjectInput, type ServiceInput } from "../lib/api";
import { BRANCH_RE, PROJECT_RE } from "../lib/format";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { Field } from "../ui/Field";
import { Icon } from "../ui/Icon";
import { useToast } from "../ui/Toast";
import { EMPTY_SERVICE, ServiceFields } from "./ServiceFields";

interface Props {
  /** null creates a new project. */
  editing?: Project | null;
  onClose: () => void;
  onSaved: (name: string) => Promise<void>;
}

/**
 * Create a project with everything about it up front (links, notes, services,
 * branches), or edit an existing one's details. Services and branches of an
 * existing project are edited on its Overview and Branches tabs.
 */
export function ProjectDialog({ editing = null, onClose, onSaved }: Props) {
  const toast = useToast();
  const [form, setForm] = useState<ProjectInput>({
    name: editing?.name ?? "",
    description: editing?.description ?? "",
    notes: editing?.notes ?? "",
    repo_url: editing?.repo_url ?? "",
    site_url: editing?.site_url ?? "",
  });
  const [services, setServices] = useState<ServiceInput[]>([]);
  const [branches, setBranches] = useState("main");
  const [error, setError] = useState("");

  const set = (field: keyof ProjectInput) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const branchNames = [...new Set(branches.split(/[\s,]+/).filter(Boolean))];
  const renaming = !!editing && form.name.trim().toLowerCase() !== editing.name;

  const save = async () => {
    const name = form.name.trim().toLowerCase();
    if (!PROJECT_RE.test(name)) return setError("Name: lowercase letters, numbers and hyphens, like my-api.");
    const badBranch = branchNames.find((b) => !BRANCH_RE.test(b) || b.includes(".."));
    if (!editing && badBranch) return setError(`“${badBranch}” isn’t a valid branch name.`);
    const kept = services.filter((s) => s.kind.trim() || s.provider.trim());
    try {
      if (editing) await api.updateProject(editing.id, { ...form, name });
      else await api.createProject({ ...form, name, services: kept, branches: branchNames });
      onClose();
      toast(editing ? `Saved ${name}` : `Created ${name}`);
      await onSaved(name);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Dialog
      eyebrow="Project"
      title={editing ? <>Edit <span className="mono">{editing.name}</span></> : "New project"}
      onClose={onClose}
      width={640}
      footer={
        <>
          <Button type="submit" form="project-form" variant="primary" size="lg" className="grow" onClick={save}>
            {editing ? "Save changes" : "Create project"}
          </Button>
          <Button size="lg" onClick={onClose}>Cancel</Button>
        </>
      }
    >
      <form id="project-form" className="form" onSubmit={(e) => e.preventDefault()}>
        <Field label="Name" htmlFor="proj-name" hint="Lowercase letters, numbers and hyphens. The CLI uses it: envvault run my-api">
          <input id="proj-name" className="input input-lg mono" placeholder="my-api" autoComplete="off" spellCheck={false} autoFocus value={form.name} onChange={set("name")} />
        </Field>
        {renaming && (
          <div className="callout">
            <strong>Renaming changes the CLI name.</strong> Anything running <span className="mono">envvault run {editing.name}</span> must switch to the new name.
          </div>
        )}
        <Field label="Description" htmlFor="proj-desc">
          <input id="proj-desc" className="input input-lg" placeholder="Express API for the mobile app" autoComplete="off" value={form.description} onChange={set("description")} />
        </Field>
        <div className="field-pair">
          <Field label="Live site" htmlFor="proj-site">
            <input id="proj-site" className="input mono" placeholder="https://my-api.example.com" autoComplete="off" spellCheck={false} value={form.site_url} onChange={set("site_url")} />
          </Field>
          <Field label="Repository" htmlFor="proj-repo">
            <input id="proj-repo" className="input mono" placeholder="https://github.com/you/my-api" autoComplete="off" spellCheck={false} value={form.repo_url} onChange={set("repo_url")} />
          </Field>
        </div>
        <Field label="Notes" htmlFor="proj-notes" hint="How it deploys, gotchas, who to ask. Stored as plain text, so keep secrets in variables.">
          <textarea id="proj-notes" className="input" rows={4} placeholder="Deploys on push to main via GitHub Actions…" value={form.notes} onChange={set("notes")} />
        </Field>

        {!editing && (
          <>
            <Field label="Branches" htmlFor="proj-branches" hint="Separated by spaces or commas. Each can override variables: envvault run my-api -b main">
              <input id="proj-branches" className="input mono" placeholder="main staging" autoComplete="off" spellCheck={false} value={branches} onChange={(e) => setBranches(e.target.value)} />
            </Field>

            <fieldset className="field">
              <legend className="field-label">Services · where it’s deployed and what it uses</legend>
              {services.map((s, i) => (
                <div key={i} className="service-edit">
                  <ServiceFields value={s} onChange={(v) => setServices((all) => all.map((x, j) => (j === i ? v : x)))} autoFocus={i === services.length - 1} />
                  <div>
                    <Button variant="ghost" size="sm" onClick={() => setServices((all) => all.filter((_, j) => j !== i))}>
                      <Icon name="trash" size={14} /> Remove
                    </Button>
                  </div>
                </div>
              ))}
              <div>
                <Button size="sm" trailing={<Icon name="plus" size={14} />} onClick={() => setServices((all) => [...all, { ...EMPTY_SERVICE }])}>
                  {services.length ? "Add another service" : "Add a service (database, hosting…)"}
                </Button>
              </div>
            </fieldset>
          </>
        )}
        {error && <div className="field-error" role="alert">{error}</div>}
      </form>
    </Dialog>
  );
}
