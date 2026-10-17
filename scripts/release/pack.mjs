#!/usr/bin/env node
// P1-24: pack the four published packages (pnpm pack resolves workspace: ranges) and print a
// Markdown table of the tarballs. Never publishes.   node scripts/release/pack.mjs --out <dir>
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PUBLISHED } from "./same-commit.mjs";

const root = path.resolve(import.meta.dirname, "..", "..");
const out = path.resolve(process.argv[process.argv.indexOf("--out") + 1]);
fs.mkdirSync(out, { recursive: true });
const rows = [];
for (const p of PUBLISHED) {
  const r = spawnSync("pnpm", ["pack", "--pack-destination", out], { cwd: path.join(root, "packages", p), encoding: "utf8" });
  if (r.status !== 0) { console.error(r.stdout, r.stderr); process.exit(1); }
  const file = r.stdout.trim().split("\n").pop().trim();
  const data = fs.readFileSync(file);
  rows.push(`| \`@usecredo/${p}\` | \`${path.basename(file)}\` | ${data.length} | \`${createHash("sha256").update(data).digest("hex").slice(0, 16)}\` |`);
}
console.log(["| Package | Tarball | Bytes | sha256 (first 16) |", "| --- | --- | --- | --- |", ...rows].join("\n"));
