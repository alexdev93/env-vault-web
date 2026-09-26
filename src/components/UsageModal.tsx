import { useState } from "react";
import { api, type Project } from "../api";
import { Icon } from "../icons";
import { copyText, useToast } from "../toast";
import { LoadingButton } from "./LoadingButton";
import { Modal } from "./Modal";

const SNIPPETS = {
  node: (p: string) => `envvault run ${p} -- node server.js\nenvvault run ${p} -- npm run dev`,
  spring: (p: string) => `envvault run ${p} -- ./mvnw spring-boot:run\nenvvault run ${p} -- java -jar target/app.jar`,
  python: (p: string) => `envvault run ${p} -- python manage.py runserver\nenvvault run ${p} -- uvicorn app.main:app --reload`,
  docker: (p: string) => `# Dockerfile\nRUN curl -fsS ${location.origin}/install.sh | sh\nCMD ["envvault", "run", "${p}", "--", "node", "server.js"]`,
};
type Lang = keyof typeof SNIPPETS;

const TABS: [Lang, string][] = [
  ["node", "Node.js"],
  ["spring", "Spring Boot"],
  ["python", "Python"],
  ["docker", "Docker"],
];

export function UsageModal({ projects, onClose }: { projects: Project[]; onClose: () => void }) {
  const toast = useToast();
  const [project, setProject] = useState(projects[0]?.name ?? "your-project");
  const [lang, setLang] = useState<Lang>("node");
  // The token is only fetched on demand and forgotten when the modal closes.
  const [token, setToken] = useState<string | null>(null);

  const install = `curl -fsS ${location.origin}/install.sh | sh\nenvvault login   # paste this vault's URL + your API token (click "Reveal" above)`;
  const snippet = SNIPPETS[lang](project || "your-project");

  const copy = (text: string, label = "Copied") => copyText(text, label, toast);

  const revealOrCopyToken = async () => {
    if (token) return copy(token, "Copied token");
    try {
      setToken((await api.token()).token);
    } catch (e) {
      toast((e as Error).message, true);
    }
  };

  return (
    <Modal onClose={onClose} style={{ maxWidth: 660 }}>
      <h2>Use this vault from any project</h2>
      <p className="muted">
        No cloning, no local files. Any machine that has the <code>envvault</code> script installed and logged in can pull a
        project's variables directly from this vault at runtime.
      </p>

      <div className="usage-block">
        <h3>Your API token</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          This is what <code>envvault login</code> asks for — not your dashboard password, and not the old vault's decryption
          key. One token works for every project and machine.
        </p>
        <div className="cmd-wrap">
          <pre className="cmd">{token ?? "•".repeat(49)}</pre>
          <LoadingButton className="ghost small icon-btn cmd-copy" title={token ? "Copy" : "Reveal"} onClick={revealOrCopyToken}>
            <Icon name={token ? "copy" : "eye"} size={15} />
          </LoadingButton>
        </div>
      </div>

      <div className="usage-block">
        <h3>One-time setup (per machine, container, or CI runner)</h3>
        <div className="cmd-wrap">
          <pre className="cmd">{install}</pre>
          <button className="ghost small icon-btn cmd-copy" title="Copy" onClick={() => copy(install)}>
            <Icon name="copy" size={15} />
          </button>
        </div>
      </div>

      <div className="usage-block">
        <label htmlFor="usageProjectSelect">Show usage for project</label>
        <select className="select" id="usageProjectSelect" value={project} onChange={(e) => setProject(e.target.value)}>
          {projects.length ? (
            projects.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)
          ) : (
            <option value="your-project">your-project</option>
          )}
        </select>
      </div>

      <div className="tabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={"tab" + (lang === id ? " active" : "")} onClick={() => setLang(id)}>
            {label}
          </button>
        ))}
      </div>
      <div className="cmd-wrap">
        <pre className="cmd">{snippet}</pre>
        <button className="ghost small icon-btn cmd-copy" title="Copy" onClick={() => copy(snippet)}>
          <Icon name="copy" size={15} />
        </button>
      </div>

      <div className="modal-actions">
        <button className="ghost" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}
