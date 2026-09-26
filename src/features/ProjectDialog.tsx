import { useState } from "react";
import { api, type Project, type ProjectDetailField, type ProjectInput, type ProjectStatus, type ServiceInput } from "../lib/api";
import { BRANCH_RE, DETAIL_SUGGESTIONS, PROJECT_RE, PROJECT_STATUSES } from "../lib/format";
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

const STEPS = ["Basics", "Where it lives", "Branches & notes"] as const;

/**
 * New project: a short guided flow (basics → where it lives → branches and
 * notes), where everything after the name is optional and "Create now" works
 * from any step. Editing shows all of the project's own fields at once;
 * services and branches are edited on the Overview and Branches tabs.
 */
export function ProjectDialog({ editing = null, onClose, onSaved }: Props) {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ProjectInput>({
    name: editing?.name ?? "",
    description: editing?.description ?? "",
    notes: editing?.notes ?? "",
    repo_url: editing?.repo_url ?? "",
    site_url: editing?.site_url ?? "",
    status: editing?.status ?? "building",
    stack: editing?.stack ?? "",
    details: editing?.details.map((d) => ({ ...d })) ?? [],
  });
  const [services, setServices] = useState<ServiceInput[]>([]);
  const [branches, setBranches] = useState("main");
  const [error, setError] = useState("");

  const set = (field: "name" | "description" | "notes" | "repo_url" | "site_url" | "stack") => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));
  const branchNames = [...new Set(branches.split(/[\s,]+/).filter(Boolean))];
  const renaming = !!editing && form.name.trim().toLowerCase() !== editing.name;
  const name = form.name.trim().toLowerCase();

  const checkName = () => {
    if (PROJECT_RE.test(name)) return true;
    setError("Name: lowercase letters, numbers and hyphens, like my-api.");
    setStep(0);
    return false;
  };

  const save = async () => {
    if (!checkName()) return;
    const badBranch = branchNames.find((b) => !BRANCH_RE.test(b) || b.includes(".."));
    if (!editing && badBranch) return setError(`“${badBranch}” isn’t a valid branch name.`);
    const details = form.details.filter((d) => d.label.trim() || d.value.trim());
    const kept = services.filter((s) => (s.kind.trim() && s.kind !== "other") || s.provider.trim());
    try {
      if (editing) await api.updateProject(editing.id, { ...form, name, details });
      else await api.createProject({ ...form, name, details, services: kept, branches: branchNames });
      onClose();
      toast(editing ? `Saved ${name}` : `Created ${name}`);
      await onSaved(name);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const next = () => {
    if (step === 0 && !checkName()) return;
    setError("");
    setStep((s) => s + 1);
  };

  const basics = (
    <>
      <Field label="Name" htmlFor="proj-name" hint="Lowercase letters, numbers and hyphens. The CLI uses it: envvault run my-api">
        <input id="proj-name" className="input input-lg mono" placeholder="my-api" autoComplete="off" spellCheck={false} autoFocus value={form.name} onChange={set("name")} />
      </Field>
      {renaming && (
        <div className="callout">
          <strong>Renaming changes the CLI name.</strong> Anything running <span className="mono">envvault run {editing.name}</span> must switch to the new name.
        </div>
      )}
      <Field label="What is it?" htmlFor="proj-desc" hint="One line you’d understand a year from now.">
        <input id="proj-desc" className="input input-lg" placeholder="Express API for the mobile app" autoComplete="off" value={form.description} onChange={set("description")} />
      </Field>
      <fieldset className="field">
        <legend className="field-label">Status</legend>
        <div className="chips" role="radiogroup" aria-label="Status">
          {PROJECT_STATUSES.map((st) => (
            <button key={st.id} type="button" role="radio" className="chip" aria-checked={form.status === st.id} title={st.hint}
              onClick={() => setForm((f) => ({ ...f, status: (f.status === st.id ? "" : st.id) as ProjectStatus }))}>
              {st.label}
            </button>
          ))}
        </div>
      </fieldset>
      <Field label="Stack" htmlFor="proj-stack" hint="Language, framework, runtime: what someone needs installed to work on it.">
        <input id="proj-stack" className="input" placeholder="Node 22 · Express · Postgres" autoComplete="off" value={form.stack} onChange={set("stack")} />
      </Field>
    </>
  );

  const links = (
    <div className="field-pair">
      <Field label="Live site" htmlFor="proj-site">
        <input id="proj-site" className="input mono" placeholder="https://my-api.example.com" autoComplete="off" spellCheck={false} value={form.site_url} onChange={set("site_url")} />
      </Field>
      <Field label="Repository" htmlFor="proj-repo">
        <input id="proj-repo" className="input mono" placeholder="https://github.com/you/my-api" autoComplete="off" spellCheck={false} value={form.repo_url} onChange={set("repo_url")} />
      </Field>
    </div>
  );

  const notesAndDetails = (
    <>
      <Field label="Notes" htmlFor="proj-notes" hint="How it deploys, gotchas, who to ask. Plain text: keep secrets in variables.">
        <textarea id="proj-notes" className="input" rows={4} placeholder="Deploys on push to main via GitHub Actions. Run migrations before deploying." value={form.notes} onChange={set("notes")} />
      </Field>
      <DetailsEditor details={form.details} onChange={(details) => setForm((f) => ({ ...f, details }))} />
    </>
  );

  const body = editing ? (
    <>
      {basics}
      {links}
      {notesAndDetails}
    </>
  ) : step === 0 ? (
    basics
  ) : step === 1 ? (
    <>
      {links}
      <fieldset className="field">
        <legend className="field-label">Services · where it’s deployed and what it uses</legend>
        <p className="field-hint">Database, hosting, email… and which account you sign in with. You can add these later on the Overview tab too.</p>
        {services.map((s, i) => (
          <div key={i} className="service-edit">
            <ServiceFields value={s} onChange={(v) => setServices((all) => all.map((x, j) => (j === i ? v : x)))} />
            <div>
              <Button variant="ghost" size="sm" onClick={() => setServices((all) => all.filter((_, j) => j !== i))}>
                <Icon name="trash" size={14} /> Remove this service
              </Button>
            </div>
          </div>
        ))}
        <div>
          <Button size="sm" trailing={<Icon name="plus" size={14} />} onClick={() => setServices((all) => [...all, { ...EMPTY_SERVICE, var_keys: [] }])}>
            {services.length ? "Add another service" : "Add a service"}
          </Button>
        </div>
      </fieldset>
    </>
  ) : (
    <>
      <Field label="Branches" htmlFor="proj-branches" hint="Separated by spaces or commas. Leave empty if one set of values is enough; add branches any time.">
        <input id="proj-branches" className="input mono" placeholder="main staging" autoComplete="off" spellCheck={false} value={branches} onChange={(e) => setBranches(e.target.value)} />
      </Field>
      <div className="callout">
        Without a branch, <span className="mono">envvault run {name || "my-api"}</span> gets the project’s default values. With{" "}
        <span className="mono">-b {branchNames[0] ?? "main"}</span>, that branch’s own values replace the defaults they share a name with.
      </div>
      {notesAndDetails}
    </>
  );

  const last = step === STEPS.length - 1;
  return (
    <Dialog
      eyebrow={editing ? "Project" : `New project · step ${step + 1} of ${STEPS.length} · ${STEPS[step]}`}
      title={editing ? <>Edit <span className="mono">{editing.name}</span></> : "New project"}
      onClose={onClose}
      width={680}
      footer={
        editing ? (
          <>
            <Button type="submit" form="project-form" variant="primary" size="lg" className="grow" onClick={save}>Save changes</Button>
            <Button size="lg" onClick={onClose}>Cancel</Button>
          </>
        ) : (
          <>
            {last ? (
              <Button type="submit" form="project-form" variant="primary" size="lg" className="grow" onClick={save}>Create project</Button>
            ) : (
              <Button type="submit" form="project-form" variant="primary" size="lg" className="grow" trailing={<Icon name="arrowRight" size={15} />} onClick={next}>
                Next: {STEPS[step + 1]}
              </Button>
            )}
            {!last && <Button size="lg" onClick={save}>Create now</Button>}
            {step > 0 ? <Button size="lg" variant="ghost" onClick={() => setStep((s) => s - 1)}>Back</Button> : <Button size="lg" variant="ghost" onClick={onClose}>Cancel</Button>}
          </>
        )
      }
    >
      {!editing && (
        <ol className="steps" aria-label="Steps">
          {STEPS.map((label, i) => (
            <li key={label} aria-current={i === step ? "step" : undefined} className={i < step ? "done" : undefined}>
              <button type="button" className="step-btn" onClick={() => (i === 0 || checkName()) && setStep(i)}>
                <span className="step-num">{i < step ? "✓" : i + 1}</span> {label}
              </button>
            </li>
          ))}
        </ol>
      )}
      <form id="project-form" className="form" onSubmit={(e) => e.preventDefault()}>
        {body}
        {error && <div className="field-error" role="alert">{error}</div>}
      </form>
    </Dialog>
  );
}

/** Free-form "label → value" facts, with suggested labels to get started. */
function DetailsEditor({ details, onChange }: { details: ProjectDetailField[]; onChange: (d: ProjectDetailField[]) => void }) {
  const used = new Set(details.map((d) => d.label));
  const update = (i: number, patch: Partial<ProjectDetailField>) => onChange(details.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  return (
    <fieldset className="field">
      <legend className="field-label">More details <span className="muted">(optional)</span></legend>
      <p className="field-hint">Anything else worth having in one place. Tap a suggestion or add your own.</p>
      {details.map((d, i) => (
        <div key={i} className="detail-row">
          <input className="input" aria-label="Label" placeholder="Label" value={d.label} onChange={(e) => update(i, { label: e.target.value })} />
          <input className="input" aria-label={d.label || "Value"} placeholder="Value" autoFocus={!d.value && !!d.label} value={d.value} onChange={(e) => update(i, { value: e.target.value })} />
          <button type="button" className="btn btn-ghost btn-icon" aria-label={`Remove ${d.label || "detail"}`} onClick={() => onChange(details.filter((_, j) => j !== i))}>
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
      <div className="chips">
        {DETAIL_SUGGESTIONS.filter((l) => !used.has(l)).slice(0, 8).map((label) => (
          <button key={label} type="button" className="chip chip-add" onClick={() => onChange([...details, { label, value: "" }])}>+ {label}</button>
        ))}
        <button type="button" className="chip chip-add" onClick={() => onChange([...details, { label: "", value: "" }])}>+ Custom</button>
      </div>
    </fieldset>
  );
}
