import { useEffect, useState } from "react";
import { api, type Item, type ItemType, type Project } from "../lib/api";
import { generatePassword } from "../lib/format";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { Field } from "../ui/Field";
import { Icon } from "../ui/Icon";
import { Seg } from "../ui/Seg";
import { useToast } from "../ui/Toast";

export const ITEM_LABELS: Record<ItemType, { one: string; many: string; value: string; title: string; hint: string }> = {
  login: { one: "Login", many: "Logins", value: "Password", title: "Neon console", hint: "A site or dashboard you sign in to." },
  note: { one: "Secure note", many: "Secure notes", value: "Note", title: "Recovery codes", hint: "Anything private: recovery codes, license keys, answers." },
  secret: { one: "Secret", many: "Secrets", value: "Secret", title: "OpenAI API key", hint: "A key or token that isn’t tied to a project’s environment." },
};

interface Props {
  /** null creates a new item. */
  editing: Item | null;
  initialType?: ItemType;
  /** Pre-linked project when adding from a project. */
  initialProjectId?: string | null;
  projects: Project[];
  onClose: () => void;
  onSaved: (id: string) => Promise<void>;
}

export function ItemDialog({ editing, initialType = "login", initialProjectId = null, projects, onClose, onSaved }: Props) {
  const toast = useToast();
  const [type, setType] = useState<ItemType>(editing?.type ?? initialType);
  const [title, setTitle] = useState(editing?.title ?? "");
  const [url, setUrl] = useState(editing?.url ?? "");
  const [username, setUsername] = useState(editing?.username ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [projectId, setProjectId] = useState<string>(editing?.project_id ?? initialProjectId ?? "");
  // Editing loads the current value only while this dialog is open.
  const [value, setValue] = useState<string | null>(editing ? null : "");
  const [showValue, setShowValue] = useState(false);
  const [error, setError] = useState("");
  const labels = ITEM_LABELS[type];

  useEffect(() => {
    if (!editing) return;
    let live = true;
    api.getItemValue(editing.id).then(
      (v) => live && setValue(v),
      (e: Error) => live && (setError(e.message), setValue("")),
    );
    return () => {
      live = false;
    };
  }, [editing]);

  const save = async () => {
    if (!title.trim()) return setError("Give it a title you’ll recognise.");
    const common = { title: title.trim(), url: type === "login" ? url : "", username: type === "login" ? username : "", notes, project_id: projectId || null, value: value ?? "" };
    try {
      const id = editing ? (await api.updateItem(editing.id, common)).id : (await api.createItem({ ...common, type, value: value ?? "" })).id;
      onClose();
      toast(`Saved ${title.trim()}`);
      await onSaved(id);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Dialog
      eyebrow={editing ? labels.one : "Personal vault"}
      title={editing ? <>Edit {editing.title}</> : `New ${labels.one.toLowerCase()}`}
      onClose={onClose}
      width={580}
      footer={
        <>
          <Button type="submit" form="item-form" variant="primary" size="lg" className="grow" onClick={save} disabled={value === null}>
            {editing ? "Save changes" : `Save ${labels.one.toLowerCase()}`}
          </Button>
          <Button size="lg" onClick={onClose}>Cancel</Button>
        </>
      }
    >
      <form id="item-form" className="form" onSubmit={(e) => e.preventDefault()}>
        {!editing && (
          <div className="stack-sm">
            <Seg label="Type" block value={type} onChange={setType} options={[["login", "Login"], ["note", "Secure note"], ["secret", "Secret"]]} />
            <p className="field-hint">{labels.hint}</p>
          </div>
        )}
        <Field label="Title" htmlFor="item-title">
          <input id="item-title" className="input input-lg" placeholder={labels.title} autoComplete="off" autoFocus={!editing} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>

        {type === "login" && (
          <>
            <Field label="Website" htmlFor="item-url">
              <input id="item-url" className="input mono" placeholder="https://console.neon.tech" autoComplete="off" spellCheck={false} value={url} onChange={(e) => setUrl(e.target.value)} />
            </Field>
            <Field label="Username or email" htmlFor="item-user">
              <input id="item-user" className="input mono" placeholder="you@gmail.com" autoComplete="off" spellCheck={false} value={username} onChange={(e) => setUsername(e.target.value)} />
            </Field>
            <Field label="Password" htmlFor="item-pass" hint="Encrypted like every value. Leave empty for “Sign in with Google” accounts.">
              <div className="input-group">
                <input
                  id="item-pass"
                  className="input mono grow"
                  type={showValue ? "text" : "password"}
                  placeholder={value === null ? "Loading…" : ""}
                  autoComplete="new-password"
                  spellCheck={false}
                  disabled={value === null}
                  value={value ?? ""}
                  onChange={(e) => setValue(e.target.value)}
                />
                <button type="button" className="btn btn-secondary btn-icon" aria-label={showValue ? "Hide password" : "Show password"} aria-pressed={showValue} onClick={() => setShowValue((s) => !s)}>
                  <Icon name={showValue ? "eyeOff" : "eye"} size={16} />
                </button>
                <Button onClick={() => (setValue(generatePassword()), setShowValue(true))} disabled={value === null}>Generate</Button>
              </div>
            </Field>
          </>
        )}

        {type !== "login" && (
          <Field label={labels.value} htmlFor="item-value" hint="Encrypted, and only fetched when you reveal or copy it.">
            <textarea
              id="item-value"
              className="input mono"
              rows={type === "note" ? 8 : 3}
              placeholder={value === null ? "Loading…" : type === "note" ? "Only you can read this." : "sk-…"}
              autoComplete="off"
              spellCheck={false}
              disabled={value === null}
              value={value ?? ""}
              onChange={(e) => setValue(e.target.value)}
            />
          </Field>
        )}

        <Field label="Notes" htmlFor="item-notes" hint="Plain text, searchable, not encrypted: no secrets here.">
          <textarea id="item-notes" className="input" rows={2} placeholder="2FA on the authenticator app · shared with nobody" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <Field label="Project" htmlFor="item-project" hint="Optional: link it to a project to see it on that project’s Overview.">
          <select id="item-project" className="select mono" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">None (personal)</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        {error && <div className="field-error" role="alert">{error}</div>}
      </form>
    </Dialog>
  );
}
