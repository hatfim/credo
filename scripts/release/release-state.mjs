#!/usr/bin/env node
// P1-24: decide whether this commit is a release commit that should be published to `latest`.
// Ready means: no pending changesets, not in prerelease mode, every published package has a plain
// x.y.z version above the 0.0.0 baseline, and at least one of them is not on npm yet.
// Refuses (exit 1) on a prerelease or `-next-` version, which must never reach `latest`.
//
//   node scripts/release/release-state.mjs [--offline] [--require-ready]   (writes ready=true|false to $GITHUB_OUTPUT)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { readPackageVersions } from "./same-commit.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");
const STABLE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function evaluate({ versions, pendingChangesets, preMode, published }) {
  const errors = [];
  for (const [name, v] of Object.entries(versions)) {
    if (!STABLE.test(v)) errors.push(`${name} is ${v}: only plain x.y.z versions may be published to latest`);
  }
  if (preMode) errors.push("changesets prerelease mode is on (.changeset/pre.json); latest must not be published from it");
  if (errors.length) return { ready: false, refuse: true, reason: errors.join("; ") };
  if (pendingChangesets > 0) return { ready: false, reason: `${pendingChangesets} pending changeset(s): the release pull request has not been merged` };
  if (Object.values(versions).every((v) => v === "0.0.0")) return { ready: false, reason: "all versions are the 0.0.0 baseline: nothing has been versioned" };
  if (Object.keys(versions).some((n) => versions[n] === "0.0.0")) return { ready: false, refuse: true, reason: "some packages are still 0.0.0 while others are versioned" };
  const todo = Object.keys(versions).filter((n) => !published[n]);
  if (todo.length === 0) return { ready: false, reason: "every version is already on npm" };
  return { ready: true, reason: `to publish: ${todo.map((n) => `${n}@${versions[n]}`).join(", ")}` };
}

function onNpm(name, version) {
  const r = spawnSync("npm", ["view", `${name}@${version}`, "version", "--json", "--registry", "https://registry.npmjs.org/"], { encoding: "utf8" });
  if (r.status === 0) return r.stdout.trim() !== "";
  if (/E404/.test(r.stdout + r.stderr)) return false;
  throw new Error(`npm view ${name}@${version} failed: ${r.stderr}`);
}

function main() {
  const versions = readPackageVersions();
  const pendingChangesets = fs.readdirSync(path.join(repoRoot, ".changeset")).filter((f) => f.endsWith(".md") && f !== "README.md").length;
  const preMode = fs.existsSync(path.join(repoRoot, ".changeset", "pre.json"));
  const published = process.argv.includes("--offline") ? {} : Object.fromEntries(Object.entries(versions).map(([n, v]) => [n, onNpm(n, v)]));
  const result = evaluate({ versions, pendingChangesets, preMode, published });
  console.log(JSON.stringify({ versions, pendingChangesets, preMode, published, ...result }, null, 2));
  if (result.refuse) { console.error(`::error::Refusing to release: ${result.reason}`); return 1; }
  console.log(`::notice::${result.ready ? "Release ready" : "No release"}: ${result.reason}`);
  if (!result.ready && process.argv.includes("--require-ready")) { console.error(`::error::Not a release commit: ${result.reason}`); return 1; }
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `ready=${result.ready}\n`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  try { process.exit(main()); } catch (e) { console.error(e.message); process.exit(1); }
}
