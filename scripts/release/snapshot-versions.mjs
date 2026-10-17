#!/usr/bin/env node
// P1-24 / main.yml publish-next: after `changeset version --snapshot next`, every package must be safe to
// hand to `changeset publish --tag next`. That command skips only versions ALREADY ON NPM, so:
//   - a package whose version changed must be a `0.0.0-next-*` snapshot;
//   - an unchanged package must be a snapshot or already on npm; an unchanged 0.0.0 that is not on npm
//     would be published (and could take `latest`), so the guard fails.
// An npm lookup that fails for any reason other than a proper 404 fails closed.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { PUBLISHED } from "./same-commit.mjs";
import { onNpm } from "./release-state.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");
const SNAPSHOT = /^0\.0\.0-next-[0-9A-Za-z.-]+$/;

/** before/after: { name: version }; isPublished(name, version) -> boolean, throws on lookup errors. */
export function checkSnapshot({ before, after, isPublished }) {
  const changed = Object.keys(after).filter((n) => after[n] !== before[n]);
  const problems = [];
  for (const n of Object.keys(after)) {
    if (SNAPSHOT.test(after[n])) continue;
    if (changed.includes(n)) problems.push(`${n} changed to ${after[n]}, which is not a 0.0.0-next-* snapshot`);
    else if (!isPublished(n, after[n])) problems.push(`${n} is unchanged at ${after[n]}, is not a snapshot and is not on npm: changeset publish would publish it`);
  }
  return { problems, changed };
}

function main() {
  const before = {}; const after = {};
  for (const p of PUBLISHED) {
    const rel = `packages/${p}/package.json`;
    const show = spawnSync("git", ["show", `HEAD:${rel}`], { cwd: repoRoot, encoding: "utf8" });
    if (show.status !== 0) throw new Error(`git show HEAD:${rel} failed`);
    before[`@usecredo/${p}`] = JSON.parse(show.stdout).version;
    after[`@usecredo/${p}`] = JSON.parse(fs.readFileSync(path.join(repoRoot, rel), "utf8")).version;
  }
  const { problems, changed } = checkSnapshot({ before, after, isPublished: (n, v) => onNpm(n, v) });
  console.log(JSON.stringify({ before, after, changed }, null, 2));
  if (problems.length) { for (const m of problems) console.error(`::error::${m}. Refusing to publish.`); return 1; }
  if (changed.length === 0) console.log("::notice::No package version changed; nothing will be published.");
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  try { process.exit(main()); } catch (e) { console.error(e.message); process.exit(1); }
}
