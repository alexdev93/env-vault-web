// "2h", "3d", "1w", "7mo": the compact age used in list rows.
export function shortAge(iso: string, now = Date.now()): string {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d`;
  if (s < 30 * 86400) return `${Math.floor(s / (7 * 86400))}w`;
  if (s < 365 * 86400) return `${Math.floor(s / (30 * 86400))}mo`;
  return `${Math.floor(s / (365 * 86400))}y`;
}

// "just now", "5m ago", "3d ago".
export function ago(iso: string, now = Date.now()): string {
  const age = shortAge(iso, now);
  return age === "now" ? "just now" : `${age} ago`;
}

export function longDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

// Projects have no stored colour yet (Phase 2 adds one), so pick a stable one from the name.
// ANSI-style swatches that read on both the paper and the dark theme.
const PROJECT_COLORS = ["#3ddc84", "#f5c451", "#5ec8f2", "#c792ea", "#ff8a65", "#8ea58e"];
export function projectColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PROJECT_COLORS[h % PROJECT_COLORS.length];
}

export const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
export const PROJECT_RE = /^[a-z0-9][a-z0-9-]*$/;
export const BRANCH_RE = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$/;

// Links typed without a scheme ("console.neon.tech") still open as https.
export function hrefFor(url: string): string {
  return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
}

// Guided service presets: pick what it is, then who provides it. Known
// providers fill in their console link and say what "name" means there.
export interface ProviderPreset {
  id: string;
  label: string;
  url: string;
  /** What the resource at this provider is called, as a placeholder for the Name field. */
  resource?: string;
  /** Variables it usually provides, suggested for linking. */
  vars?: string[];
}

export interface ServiceKind {
  id: string;
  label: string;
  hint: string;
  providers: ProviderPreset[];
}

export const SERVICE_KINDS: ServiceKind[] = [
  {
    id: "database", label: "Database", hint: "Where the data lives.",
    providers: [
      { id: "neon", label: "Neon", url: "https://console.neon.tech", resource: "Neon project", vars: ["DATABASE_URL"] },
      { id: "supabase", label: "Supabase", url: "https://supabase.com/dashboard", resource: "Supabase project", vars: ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_ANON_KEY"] },
      { id: "planetscale", label: "PlanetScale", url: "https://app.planetscale.com", resource: "database", vars: ["DATABASE_URL"] },
      { id: "turso", label: "Turso", url: "https://app.turso.tech", resource: "database", vars: ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN"] },
      { id: "mongodb atlas", label: "MongoDB Atlas", url: "https://cloud.mongodb.com", resource: "cluster", vars: ["MONGODB_URI"] },
      { id: "cloudflare d1", label: "Cloudflare D1", url: "https://dash.cloudflare.com", resource: "D1 database" },
    ],
  },
  {
    id: "hosting", label: "Hosting", hint: "Where it’s deployed.",
    providers: [
      { id: "cloudflare", label: "Cloudflare", url: "https://dash.cloudflare.com", resource: "Worker or Pages project" },
      { id: "vercel", label: "Vercel", url: "https://vercel.com/dashboard", resource: "Vercel project" },
      { id: "netlify", label: "Netlify", url: "https://app.netlify.com", resource: "site" },
      { id: "fly.io", label: "Fly.io", url: "https://fly.io/dashboard", resource: "app" },
      { id: "render", label: "Render", url: "https://dashboard.render.com", resource: "service" },
      { id: "railway", label: "Railway", url: "https://railway.app/dashboard", resource: "project" },
      { id: "aws", label: "AWS", url: "https://console.aws.amazon.com", resource: "account / service" },
    ],
  },
  {
    id: "auth", label: "Auth", hint: "Sign-in for your users.",
    providers: [
      { id: "clerk", label: "Clerk", url: "https://dashboard.clerk.com", resource: "application", vars: ["CLERK_SECRET_KEY", "CLERK_PUBLISHABLE_KEY"] },
      { id: "auth0", label: "Auth0", url: "https://manage.auth0.com", resource: "tenant", vars: ["AUTH0_CLIENT_ID", "AUTH0_CLIENT_SECRET"] },
      { id: "firebase", label: "Firebase", url: "https://console.firebase.google.com", resource: "Firebase project" },
      { id: "google oauth", label: "Google OAuth", url: "https://console.cloud.google.com/apis/credentials", resource: "OAuth client", vars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"] },
    ],
  },
  {
    id: "email", label: "Email", hint: "Sending mail.",
    providers: [
      { id: "resend", label: "Resend", url: "https://resend.com/overview", resource: "domain", vars: ["RESEND_API_KEY"] },
      { id: "sendgrid", label: "SendGrid", url: "https://app.sendgrid.com", vars: ["SENDGRID_API_KEY"] },
      { id: "postmark", label: "Postmark", url: "https://account.postmarkapp.com", resource: "server", vars: ["POSTMARK_API_TOKEN"] },
    ],
  },
  {
    id: "storage", label: "Storage", hint: "Files and uploads.",
    providers: [
      { id: "cloudflare r2", label: "Cloudflare R2", url: "https://dash.cloudflare.com", resource: "bucket", vars: ["R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"] },
      { id: "aws s3", label: "AWS S3", url: "https://s3.console.aws.amazon.com", resource: "bucket", vars: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"] },
      { id: "uploadthing", label: "UploadThing", url: "https://uploadthing.com/dashboard", resource: "app", vars: ["UPLOADTHING_TOKEN"] },
    ],
  },
  {
    id: "domain", label: "Domain & DNS", hint: "Where the domain is registered.",
    providers: [
      { id: "cloudflare", label: "Cloudflare", url: "https://dash.cloudflare.com", resource: "zone" },
      { id: "namecheap", label: "Namecheap", url: "https://ap.www.namecheap.com", resource: "domain" },
      { id: "porkbun", label: "Porkbun", url: "https://porkbun.com/account/domainsSpeedy", resource: "domain" },
    ],
  },
  {
    id: "payments", label: "Payments", hint: "Taking money.",
    providers: [
      { id: "stripe", label: "Stripe", url: "https://dashboard.stripe.com", resource: "account", vars: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] },
      { id: "paddle", label: "Paddle", url: "https://vendors.paddle.com", vars: ["PADDLE_API_KEY"] },
      { id: "chapa", label: "Chapa", url: "https://dashboard.chapa.co", vars: ["CHAPA_SECRET_KEY"] },
    ],
  },
  {
    id: "monitoring", label: "Monitoring", hint: "Errors, logs, uptime.",
    providers: [
      { id: "sentry", label: "Sentry", url: "https://sentry.io", resource: "Sentry project", vars: ["SENTRY_DSN"] },
      { id: "better stack", label: "Better Stack", url: "https://betterstack.com", resource: "source" },
    ],
  },
  {
    id: "ci", label: "Code & CI", hint: "Repository and pipelines.",
    providers: [
      { id: "github", label: "GitHub", url: "https://github.com", resource: "repository" },
      { id: "gitlab", label: "GitLab", url: "https://gitlab.com", resource: "project" },
    ],
  },
  { id: "other", label: "Other", hint: "Anything else it depends on.", providers: [] },
];

export function findKind(kind: string): ServiceKind | undefined {
  return SERVICE_KINDS.find((k) => k.id === kind.trim().toLowerCase());
}

export function findProvider(kind: string, provider: string): ProviderPreset | undefined {
  const p = provider.trim().toLowerCase();
  if (!p) return undefined;
  const kinds = findKind(kind) ? [findKind(kind)!] : SERVICE_KINDS;
  for (const k of kinds) {
    const hit = k.providers.find((x) => x.id === p || x.label.toLowerCase() === p);
    if (hit) return hit;
  }
  return undefined;
}

export const PROJECT_STATUSES: { id: string; label: string; hint: string }[] = [
  { id: "idea", label: "Idea", hint: "Not started" },
  { id: "building", label: "Building", hint: "In development" },
  { id: "live", label: "Live", hint: "In production" },
  { id: "maintenance", label: "Maintenance", hint: "Live, only fixes" },
  { id: "archived", label: "Archived", hint: "Retired" },
];

// Suggested labels for a project's free-form details.
export const DETAIL_SUGGESTIONS = [
  "Deploy command", "Local dev command", "Staging URL", "Admin panel", "API docs", "Design (Figma)",
  "Client", "Started", "Domain renews", "Node version", "Build command", "Cron / schedules",
];

// A random password from a large alphabet (no look-alike characters).
export function generatePassword(length = 24): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_=+";
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function hostOf(url: string): string {
  try {
    return new URL(hrefFor(url)).host;
  } catch {
    return url;
  }
}
