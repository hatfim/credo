#!/usr/bin/env node
// P1-24 / REL-04: build the docs and Storybook sites, stamp both with the commit SHA, and verify.
//   node scripts/release/build-sites.mjs --sha <sha>
// DOCS_URL (and optionally DOCS_BASE_URL) come from the environment, as for a normal docs build.
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..", "..");
const sha = process.argv.includes("--sha") ? process.argv[process.argv.indexOf("--sha") + 1] : process.env.GITHUB_SHA;
const docs = path.join(root, "apps/docs/build");
const storybook = path.join(root, "apps/storybook/storybook-static");
const cli = path.join(import.meta.dirname, "same-commit.mjs");

function run(cmd, args) {
  console.log(`$ ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run("pnpm", ["exec", "turbo", "run", "build", "--filter=@usecredo/docs", "--filter=@usecredo/storybook"]);
run("node", [cli, "write", "--dir", docs, "--name", "docs", "--sha", sha]);
run("node", [cli, "write", "--dir", storybook, "--name", "storybook", "--sha", sha]);
run("node", [cli, "verify", "--sha", sha, "--docs", docs, "--storybook", storybook]);
