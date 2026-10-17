// Cross-link check between the docs and Storybook (P1-19, DOC-05, PRD 9.4). Storybook is not hosted
// (docs/decisions/0003-storybook-not-hosted.md), so docs name stories by ID and never link a URL. Run it after
// `storybook build`: it reads apps/storybook/storybook-static/index.json. Fails when
//  1. the Storybook index is missing (it never passes without it);
//  2. a story ID linked from a docs page is not in the index;
//  3. a stable component has no docs page, or its page links no story;
//  4. a stable component has no stories in the index, or its story file does not link back to
//     its docs page.
//
// Stable components, from one source: the subpath exports of @usecredo/ui (packages/ui/package.json
// `exports`, minus "."), except subpaths listed in that file's `credo.experimental` array
// (for example `"credo": { "experimental": ["./chart"] }`). A subpath "./button" is the component
// `button`; its docs page is docs/components/button.mdx, its stories are the story files under
// packages/ui/src/button/.
//
// A docs page references a story by its ID written as inline code, for example
// `components-button--default` (the shape is <kind>--<name>).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");
const docsDir = path.join(root, "apps/docs/docs");
const indexPath = process.env["STORYBOOK_INDEX"] ?? path.join(root, "apps/storybook/storybook-static/index.json");
const uiDir = path.join(root, "packages/ui");

const fail = (lines) => {
  console.error("check:stories failed:");
  for (const l of lines) console.error(`  - ${l}`);
  process.exit(1);
};

if (!existsSync(indexPath)) {
  fail([
    `Storybook index not found at ${path.relative(root, indexPath)}.`,
    "Run `pnpm --filter @usecredo/storybook build` first; this check never passes without it.",
  ]);
}
const index = JSON.parse(readFileSync(indexPath, "utf8"));
const stories = Object.values(index.entries ?? {}).filter((e) => e.type === "story");
if (stories.length === 0) fail([`${path.relative(root, indexPath)} contains no stories.`]);
const storyIds = new Set(stories.map((s) => s.id));

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.name.startsWith("_") ? [] : e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
  );
const pages = walk(docsDir).filter((f) => /\.mdx?$/.test(f));

const problems = [];
const linkedByPage = new Map();
for (const page of pages) {
  const text = readFileSync(page, "utf8");
  const ids = new Set();
  for (const m of text.matchAll(/`([a-z0-9]+(?:-[a-z0-9]+)*--[a-z0-9]+(?:-[a-z0-9]+)*)`/g)) ids.add(m[1]);
  linkedByPage.set(page, ids);
  for (const id of ids) {
    if (!storyIds.has(id)) {
      problems.push(`${path.relative(root, page)} references story "${id}", which is not in the Storybook index`);
    }
  }
}

const pkg = JSON.parse(readFileSync(path.join(uiDir, "package.json"), "utf8"));
const experimental = new Set(pkg.credo?.experimental ?? []);
const stable = Object.keys(pkg.exports)
  .filter((key) => key !== "." && !experimental.has(key))
  .map((key) => key.replace(/^\.\//, ""));
if (stable.length === 0) problems.push("@usecredo/ui exports no stable component subpath");

for (const name of stable) {
  const page = ["mdx", "md"].map((ext) => path.join(docsDir, "components", `${name}.${ext}`)).find(existsSync);
  if (!page) {
    problems.push(`stable component "${name}" has no docs page (expected apps/docs/docs/components/${name}.mdx)`);
  } else if ((linkedByPage.get(page)?.size ?? 0) === 0) {
    problems.push(`docs page for "${name}" references no story`);
  }

  const marker = `/packages/ui/src/${name}/`;
  const own = stories.filter((s) => `/${s.importPath.replace(/^(\.\.?\/)+/, "")}`.includes(marker));
  if (own.length === 0) problems.push(`stable component "${name}" has no stories in the Storybook index`);

  const srcDir = path.join(uiDir, "src", name);
  const storyFiles = existsSync(srcDir) ? readdirSync(srcDir).filter((f) => /\.stories\.tsx?$/.test(f)) : [];
  if (storyFiles.length > 0) {
    const docsRoute = `/components/${name}`;
    const linksBack = storyFiles.some((f) => readFileSync(path.join(srcDir, f), "utf8").includes(docsRoute));
    if (!linksBack) problems.push(`stories of "${name}" do not link back to the docs page (${docsRoute})`);
  }
}

if (problems.length) fail(problems);
const linked = [...linkedByPage.values()].reduce((n, s) => n + s.size, 0);
console.log(`check:stories ok: ${linked} linked story IDs found in the index, ${stable.length} stable component(s) (${stable.join(", ")}) have docs and stories`);
