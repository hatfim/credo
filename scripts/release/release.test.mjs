import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { compare, makeBuildInfo } from "./same-commit.mjs";
import { evaluate, isNotFound, onNpm } from "./release-state.mjs";
import { checkSnapshot } from "./snapshot-versions.mjs";

const A = "a".repeat(40);
const B = "b".repeat(40);
const pk = { "@usecredo/ui": "1.0.0", "@usecredo/tokens": "1.0.0" };
const info = (sha, packages = pk, name = "x") => makeBuildInfo({ name, sha, packages });

test("same commit everywhere passes", () => {
  assert.deepEqual(compare({ expectedSha: A, headSha: A, packages: pk, infos: { docs: info(A, pk, "docs"), storybook: info(A, pk, "storybook") } }), []);
});
test("a site built from another commit fails", () => {
  const p = compare({ expectedSha: A, headSha: A, packages: pk, infos: { docs: info(A, pk, "docs"), storybook: info(B, pk, "storybook") } });
  assert.ok(p.some((m) => m.includes("storybook: built from")));
  assert.ok(p.some((m) => m.includes("disagree")));
});
test("HEAD differing from the release SHA fails", () => {
  assert.equal(compare({ expectedSha: A, headSha: B, packages: pk, infos: { docs: info(A, pk, "docs"), storybook: info(A, pk, "storybook") } }).length, 1);
});
test("missing build-info and version drift fail", () => {
  assert.ok(compare({ expectedSha: A, packages: pk, infos: { docs: null, storybook: info(A, pk, "storybook") } }).some((m) => m.includes("no build-info")));
  assert.ok(compare({ expectedSha: A, packages: pk, infos: { docs: info(A, { ...pk, "@usecredo/ui": "0.9.0" }, "docs"), storybook: info(A, pk, "storybook") } }).length > 0);
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

test("swapped site directories fail on build-info name", () => {
  const p = compare({ expectedSha: A, headSha: A, packages: pk, infos: { docs: info(A, pk, "storybook"), storybook: info(A, pk, "docs") } });
  assert.equal(p.filter((m) => m.includes("swapped")).length, 2);
});

test("snapshot check: all four changed, one changed, none changed, a changed non-snapshot", () => {
  const before = { a: "0.0.0", b: "0.0.0", c: "0.0.0", d: "0.0.0" };
  const snap = "0.0.0-next-20261017061315";
  assert.deepEqual(checkSnapshot({ before, after: { a: snap, b: snap, c: snap, d: snap } }).problems, []);
  const one = checkSnapshot({ before, after: { ...before, a: snap } });
  assert.deepEqual(one.problems, []); assert.deepEqual(one.changed, ["a"]);
  assert.deepEqual(checkSnapshot({ before, after: before }).changed, []);
  assert.equal(checkSnapshot({ before, after: { ...before, a: "0.1.0" } }).problems.length, 1);
  assert.equal(checkSnapshot({ before, after: { ...before, a: "0.0.0-rc.1" } }).problems.length, 1);
});

test("npm view: only a genuine E404 means not published; everything else fails closed", () => {
  const run = (r) => () => r;
  assert.equal(onNpm("p", "1.0.0", run({ status: 0, stdout: '"1.0.0"\n', stderr: "" })), true);
  // Package exists at another version: npm answers 404 for the requested version.
  assert.equal(onNpm("p", "9.9.9", run({ status: 1, stdout: '{"error":{"code":"E404","summary":"No match found for version 9.9.9"}}', stderr: "" })), false);
  assert.equal(onNpm("p", "1.0.0", run({ status: 1, stdout: "", stderr: "npm error code E404\nnpm error 404 Not Found - GET https://registry.npmjs.org/p" })), false);
  assert.throws(() => onNpm("p", "1.0.0", run({ status: 1, stdout: '{"error":{"code":"E502","summary":"Bad gateway, upstream said E404 earlier"}}', stderr: "npm error code E502\nnpm error Bad gateway (mentions E404 and 404 Not Found text)" })));
  assert.equal(isNotFound({ stderr: "npm error network ETIMEDOUT while fetching E404 page" }), false);
});
