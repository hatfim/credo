#!/usr/bin/env node
// P1-24 / REL-04: every site build records the commit it was built from in build-info.json. The
// verify command fails when the docs build, the release commit and the package versions on disk
// do not all agree. Only the docs site is hosted (docs/decisions/0003-storybook-not-hosted.md).
//
//   node scripts/release/same-commit.mjs write  --dir <build dir> --name docs --sha <sha>
//   node scripts/release/same-commit.mjs verify --sha <sha> --docs <dir|url> [--no-git]
//
// <dir|url>: a build directory, or the base URL of a deployed site (fetches <url>/build-info.json).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");
export const PUBLISHED = ["tokens", "tailwind-config", "icons", "ui"];
const SHA = /^[0-9a-f]{40}$/;

export function readPackageVersions(root = repoRoot) {
  const out = {};
  for (const p of PUBLISHED) {
    out[`@usecredo/${p}`] = JSON.parse(fs.readFileSync(path.join(root, "packages", p, "package.json"), "utf8")).version;
  }
  return out;
}

export function makeBuildInfo({ name, sha, packages }) {
  if (!SHA.test(sha ?? "")) throw new Error(`"${sha}" is not a full 40-character commit SHA`);
  return { schema: 1, name, sha, packages };
}

/** Pure comparison. Returns a list of problems; empty means every source agrees. */
export function compare({ expectedSha, headSha, packages, infos }) {
  const problems = [];
  if (!SHA.test(expectedSha ?? "")) problems.push(`release SHA "${expectedSha}" is not a full commit SHA`);
  if (headSha !== undefined && headSha !== expectedSha) problems.push(`checked-out HEAD ${headSha} differs from release SHA ${expectedSha}`);
  for (const [label, info] of Object.entries(infos)) {
    if (!info) { problems.push(`${label}: no build-info.json`); continue; }
    if (info.name !== label) problems.push(`${label}: build-info.json says it is the "${info.name}" site (wrong directory?)`);
    if (info.sha !== expectedSha) problems.push(`${label}: built from ${info.sha}, release is ${expectedSha}`);
    for (const [pkg, version] of Object.entries(packages)) {
      if (info.packages?.[pkg] !== version) problems.push(`${label}: ${pkg} is ${info.packages?.[pkg]}, package.json says ${version}`);
    }
  }
  return problems;
}

async function load(src) {
  if (/^https?:\/\//.test(src)) {
    const res = await fetch(new URL("build-info.json", src.endsWith("/") ? src : `${src}/`), { redirect: "follow", cache: "no-store" });
    return res.ok ? res.json() : null;
  }
  const file = path.join(src, "build-info.json");
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}

function headSha() {
  const r = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" });
  if (r.status !== 0) throw new Error("git rev-parse HEAD failed; pass --no-git to skip the HEAD check");
  return r.stdout.trim();
}

async function main(argv) {
  const [cmd, ...rest] = argv;
  const opt = (n) => (rest.includes(n) ? rest[rest.indexOf(n) + 1] : undefined);
  if (cmd === "write") {
    const info = makeBuildInfo({ name: opt("--name"), sha: opt("--sha"), packages: readPackageVersions() });
    fs.writeFileSync(path.join(opt("--dir"), "build-info.json"), `${JSON.stringify(info, null, 2)}\n`);
    console.log(`wrote ${opt("--dir")}/build-info.json (${info.name} @ ${info.sha})`);
    return 0;
  }
  if (cmd === "verify") {
    const problems = compare({
      expectedSha: opt("--sha"),
      headSha: rest.includes("--no-git") ? undefined : headSha(),
      packages: readPackageVersions(),
      infos: { docs: await load(opt("--docs")) },
    });
    if (problems.length) {
      for (const p of problems) console.error(`::error::${p}`);
      console.error("The docs site and the release are not from the same commit.");
      return 1;
    }
    console.log(`OK: docs and packages all match ${opt("--sha")}`);
    return 0;
  }
  console.error("usage: same-commit.mjs write|verify ...");
  return 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(e.message); process.exit(1); });
}
