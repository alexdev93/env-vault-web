import { useState } from "react";
import { api, type Project } from "../lib/api";
import { useSettings, type SnippetLang } from "../lib/settings";
import { CodeBlock } from "../ui/CodeBlock";
import { Dialog } from "../ui/Dialog";
import { SecretField } from "../ui/SecretField";
import { Seg } from "../ui/Seg";
import { useCopy } from "./useCopy";

export const LANGS: [SnippetLang, string][] = [
  ["node", "Node.js"],
  ["python", "Python"],
  ["spring", "Spring Boot"],
  ["docker", "Docker"],
];

export const SNIPPETS: Record<SnippetLang, (p: string) => string> = {
  node: (p) => `envvault run ${p} -- node server.js\nenvvault run ${p} -- npm run dev`,
  python: (p) => `envvault run ${p} -- python manage.py runserver\nenvvault run ${p} -- uvicorn app.main:app --reload`,
  spring: (p) => `envvault run ${p} -- ./mvnw spring-boot:run\nenvvault run ${p} -- java -jar target/app.jar`,
  docker: (p) => `# Dockerfile\nRUN curl -fsS ${location.origin}/install.sh | sh\nCMD ["envvault", "run", "${p}", "--", "node", "server.js"]`,
};

export function UsageDialog({ projects, initialProject, onClose }: { projects: Project[]; initialProject?: string | null; onClose: () => void }) {
  const [settings] = useSettings();
  const copy = useCopy();
  const [project, setProject] = useState(initialProject ?? projects[0]?.name ?? "your-project");
  const [lang, setLang] = useState<SnippetLang>(settings.snippetLang);

  const install = `# once per machine, container or CI runner\ncurl -fsS ${location.origin}/install.sh | sh\nenvvault login   # paste this vault's URL and your API token`;
  const snippet = SNIPPETS[lang](project || "your-project");

  return (
    <Dialog eyebrow="Use in your app" title="Run your app with this vault" onClose={onClose} width={680}>
      <div className="stack">
        <p className="muted">
          Put <code className="mono">envvault run</code> in front of the command you already use. Your app reads the values as
          normal environment variables, and nothing is written to disk.
        </p>

        <section className="stack-sm">
          <h3 className="step">1 · Install once</h3>
          <CodeBlock code={install} onCopy={(c) => copy(c, "install command")} />
        </section>

        <section className="stack-sm">
          <h3 className="step">2 · Your API token</h3>
          <p className="field-hint">
            This is what <code className="mono">envvault login</code> asks for, not your vault password. In CI, set it as{" "}
            <code className="mono">ENV_VAULT_TOKEN</code>.
          </p>
          <SecretField label="API token" fetchValue={async () => (await api.token()).token} onCopy={(t) => copy(t, "API token", true)} />
        </section>

        <section className="stack-sm">
          <h3 className="step">3 · Start your app</h3>
          <div className="row-wrap">
            <label className="sort">
              <span className="muted">Project</span>
              <select className="select mono" value={project} onChange={(e) => setProject(e.target.value)}>
                {projects.length ? projects.map((p) => <option key={p.id} value={p.name}>{p.name}</option>) : <option value="your-project">your-project</option>}
              </select>
            </label>
            <Seg label="Language" size="sm" value={lang} onChange={setLang} options={LANGS} />
          </div>
          <CodeBlock tone="dark" code={snippet} onCopy={(c) => copy(c, "command")} />
        </section>
      </div>
    </Dialog>
  );
}
