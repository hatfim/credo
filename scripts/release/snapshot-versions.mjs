#!/usr/bin/env node
// P1-24 / main.yml publish-next: after `changeset version --snapshot next`, every package whose version
// CHANGED must be a `0.0.0-next-*` snapshot. Packages that did not change are skipped by
// `changeset publish` (their version is already on npm), so they are not checked.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { PUBLISHED } from "./same-commit.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");
const SNAPSHOT = /^0\.0\.0-next-[0-9A-Za-z.-]+$/;

/** before/after: { name: version }. Returns { problems, changed }. */
export function checkSnapshot({ before, after }) {
  const changed = Object.keys(after).filter((n) => after[n] !== before[n]);
  const problems = changed.filter((n) => !SNAPSHOT.test(after[n])).map((n) => `${n} changed to ${after[n]}, which is not a 0.0.0-next-* snapshot`);
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
  const { problems, changed } = checkSnapshot({ before, after });
  console.log(JSON.stringify({ before, after, changed }, null, 2));
  if (problems.length) { for (const m of problems) console.error(`::error::${m}. Refusing to publish.`); return 1; }
  if (changed.length === 0) console.log("::notice::No package version changed; nothing will be published.");
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  try { process.exit(main()); } catch (e) { console.error(e.message); process.exit(1); }
}
