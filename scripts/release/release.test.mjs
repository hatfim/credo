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

test("docs built from the release commit with matching versions passes", () => {
  assert.deepEqual(compare({ expectedSha: A, headSha: A, packages: pk, infos: { docs: info(A, pk, "docs") } }), []);
});
test("docs stamped with another commit fails", () => {
  const p = compare({ expectedSha: A, headSha: A, packages: pk, infos: { docs: info(B, pk, "docs") } });
  assert.ok(p.some((m) => m.includes("docs: built from")));
});
test("HEAD differing from the release SHA fails", () => {
  assert.equal(compare({ expectedSha: A, headSha: B, packages: pk, infos: { docs: info(A, pk, "docs") } }).length, 1);
});
test("missing build-info and version drift fail", () => {
  assert.ok(compare({ expectedSha: A, packages: pk, infos: { docs: null } }).some((m) => m.includes("no build-info")));
  assert.ok(compare({ expectedSha: A, packages: pk, infos: { docs: info(A, { ...pk, "@usecredo/ui": "0.9.0" }, "docs") } }).length > 0);
});
test("a short SHA is rejected", () => {
  assert.throws(() => makeBuildInfo({ name: "x", sha: "abc", packages: pk }));
});
test("CLI verify exits non-zero on mismatch and zero on match", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "same-commit-"));
  const cli = path.join(import.meta.dirname, "same-commit.mjs");
  const docs = path.join(dir, "docs");
  fs.mkdirSync(docs);
  const run = (...a) => spawnSync("node", [cli, ...a, "--no-git"], { encoding: "utf8" });
  assert.equal(run("verify", "--sha", A, "--docs", docs).status, 1, "no build-info.json yet");
  assert.equal(run("write", "--dir", docs, "--name", "docs", "--sha", A).status, 0);
  assert.equal(run("verify", "--sha", A, "--docs", docs).status, 0);
  assert.equal(run("write", "--dir", docs, "--name", "docs", "--sha", B).status, 0);
  const bad = run("verify", "--sha", A, "--docs", docs);
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

test("a build-info stamped for another site fails on the name check", () => {
  const p = compare({ expectedSha: A, headSha: A, packages: pk, infos: { docs: info(A, pk, "storybook") } });
  assert.equal(p.filter((m) => m.includes("wrong directory")).length, 1);
});

const snap = "0.0.0-next-20261017061315";
const base = { a: "0.0.0", b: "0.0.0", c: "0.0.0", d: "0.0.0" };
const onNpmFake = (published) => (n) => published.includes(n);

test("snapshot check: all four changed passes", () => {
  const r = checkSnapshot({ before: base, after: { a: snap, b: snap, c: snap, d: snap }, isPublished: onNpmFake([]) });
  assert.deepEqual(r.problems, []);
});
test("snapshot check: none changed passes only when the versions are on npm, with a fake npm", () => {
  const before = { a: "0.1.0", b: "0.1.0", c: "0.1.0", d: "0.1.0" };
  const r = checkSnapshot({ before, after: before, isPublished: onNpmFake(["a", "b", "c", "d"]) });
  assert.deepEqual(r.problems, []); assert.deepEqual(r.changed, []);
});
test("snapshot check: one changed, the others at 0.1.0 and on npm, passes", () => {
  const before = { a: "0.1.0", b: "0.1.0", c: "0.1.0", d: "0.1.0" };
  const r = checkSnapshot({ before, after: { ...before, a: snap }, isPublished: onNpmFake(["b", "c", "d"]) });
  assert.deepEqual(r.problems, []); assert.deepEqual(r.changed, ["a"]);
});
test("snapshot check: ui changed, the others unchanged at 0.0.0 and not on npm, fails (reviewer reproduction)", () => {
  const r = checkSnapshot({ before: base, after: { ...base, a: snap }, isPublished: onNpmFake([]) });
  assert.equal(r.problems.length, 3);
  assert.match(r.problems[0], /would publish it/);
});
test("snapshot check: a changed non-snapshot fails", () => {
  assert.equal(checkSnapshot({ before: base, after: { ...base, a: "0.1.0" }, isPublished: onNpmFake(["b", "c", "d"]) }).problems.length, 1);
  assert.equal(checkSnapshot({ before: base, after: { ...base, a: "0.0.0-rc.1" }, isPublished: onNpmFake(["b", "c", "d"]) }).problems.length, 1);
});
test("snapshot check: npm lookup errors fail closed (503, ENOTFOUND, 502 mentioning E404)", () => {
  const cases = [
    { status: 1, stdout: "", stderr: "npm error code E503\nnpm error 503 Service Unavailable" },
    { status: 1, stdout: "", stderr: "npm error code ENOTFOUND\nnpm error network request failed" },
    { status: 1, stdout: '{"error":{"code":"E502","summary":"Bad gateway, upstream said E404"}}', stderr: "npm error code E502\nnpm error E404 text" },
  ];
  for (const r of cases) {
    assert.throws(() => checkSnapshot({ before: base, after: { ...base, a: snap }, isPublished: (n, v) => onNpm(n, v, () => r) }));
  }
  // A proper 404 means "not on npm": the guard fails with a problem instead of passing.
  const notFound = () => ({ status: 1, stdout: "", stderr: "npm error code E404\nnpm error 404 Not Found" });
  assert.equal(checkSnapshot({ before: base, after: { ...base, a: snap }, isPublished: (n, v) => onNpm(n, v, notFound) }).problems.length, 3);
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

// P1-25: the per-app Vercel configs must stay consistent with the release build layout.
const repoRoot = path.resolve(import.meta.dirname, "..", "..");
for (const [app, name, out] of [["docs", "@usecredo/docs", "build"]]) {
  test(`apps/${app}/vercel.json matches the build layout and leaves main to the release workflow`, () => {
    const cfg = JSON.parse(fs.readFileSync(path.join(repoRoot, "apps", app, "vercel.json"), "utf8"));
    const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "apps", app, "package.json"), "utf8"));
    assert.equal(pkg.name, name);
    assert.equal(cfg.outputDirectory, out);
    assert.match(cfg.installCommand, /pnpm install --frozen-lockfile$/);
    assert.ok(cfg.buildCommand.includes(`--filter=${name}...`));
    assert.equal(cfg.git.deploymentEnabled.main, false);
    assert.ok(!("ignoreCommand" in cfg), "an ignore command could skip builds that change dependencies");
  });
}
test("Storybook is not hosted: no Storybook Vercel config", () => {
  assert.equal(fs.existsSync(path.join(repoRoot, "apps", "storybook", "vercel.json")), false);
});
