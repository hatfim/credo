import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { compare, makeBuildInfo } from "./same-commit.mjs";
import { evaluate } from "./release-state.mjs";

const A = "a".repeat(40);
const B = "b".repeat(40);
const pk = { "@usecredo/ui": "1.0.0", "@usecredo/tokens": "1.0.0" };
const info = (sha, packages = pk) => makeBuildInfo({ name: "x", sha, packages });

test("same commit everywhere passes", () => {
  assert.deepEqual(compare({ expectedSha: A, headSha: A, packages: pk, infos: { docs: info(A), storybook: info(A) } }), []);
});
test("a site built from another commit fails", () => {
  const p = compare({ expectedSha: A, headSha: A, packages: pk, infos: { docs: info(A), storybook: info(B) } });
  assert.ok(p.some((m) => m.includes("storybook: built from")));
  assert.ok(p.some((m) => m.includes("disagree")));
});
test("HEAD differing from the release SHA fails", () => {
  assert.equal(compare({ expectedSha: A, headSha: B, packages: pk, infos: { docs: info(A), storybook: info(A) } }).length, 1);
});
test("missing build-info and version drift fail", () => {
  assert.ok(compare({ expectedSha: A, packages: pk, infos: { docs: null, storybook: info(A) } }).some((m) => m.includes("no build-info")));
  assert.ok(compare({ expectedSha: A, packages: pk, infos: { docs: info(A, { ...pk, "@usecredo/ui": "0.9.0" }), storybook: info(A) } }).length > 0);
});
test("a short SHA is rejected", () => {
  assert.throws(() => makeBuildInfo({ name: "x", sha: "abc", packages: pk }));
});
test("CLI verify exits non-zero on mismatch and zero on match", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "same-commit-"));
  const cli = path.join(import.meta.dirname, "same-commit.mjs");
  const mk = (n) => { const d = path.join(dir, n); fs.mkdirSync(d); return d; };
  const [docs, sb] = [mk("docs"), mk("sb")];
  const run = (...a) => spawnSync("node", [cli, ...a, "--no-git"], { encoding: "utf8" });
  assert.equal(run("write", "--dir", docs, "--name", "docs", "--sha", A).status, 0);
  assert.equal(run("write", "--dir", sb, "--name", "storybook", "--sha", A).status, 0);
  assert.equal(run("verify", "--sha", A, "--docs", docs, "--storybook", sb).status, 0);
  assert.equal(run("write", "--dir", sb, "--name", "storybook", "--sha", B).status, 0);
  const bad = run("verify", "--sha", A, "--docs", docs, "--storybook", sb);
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /not from the same commit/);
});

const v = (x) => ({ "@usecredo/ui": x, "@usecredo/tokens": x });
test("release state: not ready with pending changesets or at baseline", () => {
  assert.equal(evaluate({ versions: v("0.1.0"), pendingChangesets: 2, preMode: false, published: {} }).ready, false);
  assert.equal(evaluate({ versions: v("0.0.0"), pendingChangesets: 0, preMode: false, published: {} }).ready, false);
});
test("release state: ready only for stable unpublished versions", () => {
  assert.equal(evaluate({ versions: v("0.1.0"), pendingChangesets: 0, preMode: false, published: {} }).ready, true);
  assert.equal(evaluate({ versions: v("0.1.0"), pendingChangesets: 0, preMode: false, published: { "@usecredo/ui": true, "@usecredo/tokens": true } }).ready, false);
});
test("release state: refuses next snapshots, prereleases and prerelease mode", () => {
  for (const x of ["0.0.0-next-20261017061315", "1.0.0-rc.1", "1.0.0-next.3"]) {
    const r = evaluate({ versions: v(x), pendingChangesets: 0, preMode: false, published: {} });
    assert.equal(r.ready, false); assert.equal(r.refuse, true);
  }
  assert.equal(evaluate({ versions: v("1.0.0"), pendingChangesets: 0, preMode: true, published: {} }).refuse, true);
});
