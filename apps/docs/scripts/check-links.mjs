// Offline check of the built site (PRD 11.2 `check:links`): every internal href and src in
// build/**/*.html must resolve to a file in build/, and every #fragment to an id on the
// target page. Docusaurus's own `onBrokenLinks: 'throw'` covers authoring time; this
// covers the final HTML. Writes link-report/report.json. External links are not fetched.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../build");
if (!existsSync(root)) {
  console.error("build/ not found. Run `pnpm --filter @usecredo/docs build` first.");
  process.exit(1);
}
const base = (process.env.DOCS_BASE_URL ?? "/").replace(/\/?$/, "/");

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
  );
const pages = walk(root).filter((f) => f.endsWith(".html"));

const resolveTarget = (urlPath) => {
  const rel = decodeURIComponent(urlPath.slice(base.length));
  for (const c of [rel, path.join(rel, "index.html"), `${rel}.html`]) {
    const full = path.join(root, c);
    if (existsSync(full) && !readdirSafe(full)) return full;
  }
  return undefined;
};
const readdirSafe = (p) => {
  try {
    return readdirSync(p).length >= 0;
  } catch {
    return false;
  }
};
const idCache = new Map();
const ids = (file) => {
  if (!idCache.has(file)) {
    const html = readFileSync(file, "utf8");
    idCache.set(file, new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1])));
  }
  return idCache.get(file);
};

const broken = [];
let checked = 0;
for (const page of pages) {
  const html = readFileSync(page, "utf8");
  const pageUrl = base + path.relative(root, page).replaceAll(path.sep, "/");
  for (const m of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const raw = m[1];
    if (/^([a-z][a-z0-9+.-]*:|\/\/|data:)/i.test(raw)) continue;
    const url = new URL(raw, `http://x${pageUrl}`);
    if (!url.pathname.startsWith(base)) continue;
    checked += 1;
    const target = resolveTarget(url.pathname);
    if (!target) broken.push({ page: pageUrl, link: raw, reason: "missing file" });
    else if (url.hash && target.endsWith(".html") && !ids(target).has(url.hash.slice(1)))
      broken.push({ page: pageUrl, link: raw, reason: "missing anchor" });
  }
}

const out = path.resolve(import.meta.dirname, "../link-report");
mkdirSync(out, { recursive: true });
writeFileSync(
  path.join(out, "report.json"),
  JSON.stringify({ pages: pages.length, checked, broken }, null, 2),
);
if (broken.length) {
  for (const b of broken) console.error(`${b.page}: ${b.link} (${b.reason})`);
  process.exit(1);
}
console.log(`check:links ok: ${checked} internal links on ${pages.length} pages`);
