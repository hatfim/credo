#!/usr/bin/env node
// P1-26 / DST-08: install the representative consumers from packed tarballs served by a local
// registry, in an isolated directory (no workspace links), then build them and run their tests.
//
//   pnpm test:consumers [--only vite-app|next-app] [--skip-build] [--keep]
//
// Safety: the registry listens on 127.0.0.1 only. The @usecredo/* names have no uplink, so they
// can never resolve from, or be published to, npmjs.org. Third-party packages are proxied
// read-only through the local registry so the consumers can install their own dependencies.
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : undefined;

const PUBLISHED = ["tokens", "tailwind-config", "icons", "ui"];
const CONSUMERS = ["vite-app", "next-app"].filter((c) => !only || c === only);
const COPY_SKIP = new Set(["node_modules", "dist", ".next", ".turbo", "coverage", "next-env.d.ts"]);

function log(msg) {
  console.log(`\n[consumers] ${msg}`);
}

function fail(msg) {
  throw new Error(msg);
}

/** Environment for child processes: no inherited npm/pnpm auth or registry settings. */
function cleanEnv(extra = {}) {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (/^npm_/i.test(k) || ["NODE_AUTH_TOKEN", "NPM_TOKEN", "NODE_ENV"].includes(k)) continue;
    env[k] = v;
  }
  return { ...env, NEXT_TELEMETRY_DISABLED: "1", ...extra };
}

function run(cmd, cmdArgs, { cwd = repoRoot, env = cleanEnv() } = {}) {
  console.log(`$ ${cmd} ${cmdArgs.join(" ")}   (in ${path.relative(repoRoot, cwd) || "."})`);
  const r = spawnSync(cmd, cmdArgs, { cwd, env, stdio: "inherit" });
  if (r.status !== 0) fail(`Command failed (${r.status ?? r.signal}): ${cmd} ${cmdArgs.join(" ")}`);
}

function capture(cmd, cmdArgs, opts = {}) {
  const r = spawnSync(cmd, cmdArgs, { encoding: "utf8", ...opts });
  if (r.status !== 0) fail(`Command failed: ${cmd} ${cmdArgs.join(" ")}\n${r.stderr}`);
  return r.stdout;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

/** Refuse anything that is not the loopback registry started by this script. */
function assertLocal(url) {
  const u = new URL(url);
  if (u.protocol !== "http:" || u.hostname !== "127.0.0.1") {
    fail(`Refusing to use registry ${url}: only http://127.0.0.1 is allowed.`);
  }
}

async function waitForRegistry(url, child) {
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) fail("The local registry exited before it was ready.");
    try {
      const res = await fetch(`${url}-/ping`);
      if (res.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  fail("The local registry did not become ready in 20 seconds.");
}

function copyConsumer(name, dest) {
  fs.cpSync(path.join(repoRoot, "consumers", name), dest, {
    recursive: true,
    filter: (src) => !COPY_SKIP.has(path.basename(src)) && !src.endsWith(".tsbuildinfo"),
  });
}

/** Point the published @usecredo/* dependencies at the packed versions; drop private tooling. */
function rewriteManifest(dir, versions) {
  const file = path.join(dir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const section of ["dependencies", "devDependencies"]) {
    for (const dep of Object.keys(pkg[section] ?? {})) {
      if (versions.has(dep)) pkg[section][dep] = versions.get(dep);
      else if (dep.startsWith("@usecredo/") || dep === "eslint") delete pkg[section][dep];
    }
  }
  fs.writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
  fs.rmSync(path.join(dir, "eslint.config.js"), { force: true });
  return pkg;
}

/** The workspace file keeps the catalog (same third-party versions as the repo) but no members. */
function writeWorkspaceFile(dir) {
  const source = fs.readFileSync(path.join(repoRoot, "pnpm-workspace.yaml"), "utf8");
  const withoutPackages = source.replace(/^packages:\n(?:[ \t]+-.*\n)+/m, "");
  if (withoutPackages === source) fail("Could not find the packages block in pnpm-workspace.yaml.");
  fs.writeFileSync(path.join(dir, "pnpm-workspace.yaml"), `packages:\n  - "."\n\n${withoutPackages}`);
}

function assertIsolated(dir, name, registryUrl, versions, integrity) {
  const root = fs.realpathSync(dir);
  for (const dep of versions.keys()) {
    const link = path.join(dir, "node_modules", dep);
    if (!fs.existsSync(link)) continue; // a published package this consumer does not depend on directly
    const rel = path.relative(root, fs.realpathSync(link));
    if (rel.startsWith("..") || path.isAbsolute(rel)) fail(`${name}: ${dep} resolves outside the isolated directory.`);
  }
  const lock = fs.readFileSync(path.join(dir, "pnpm-lock.yaml"), "utf8");
  if (/\b(link|file|workspace):/.test(lock)) fail(`${name}: lockfile contains a link, file or workspace entry.`);
  // The lockfile integrity of each @usecredo package must equal the hash of the tarball packed here.
  for (const [dep, version] of versions) {
    const entry = lock.split("\n").findIndex((l) => l.startsWith(`  '${dep}@${version}':`));
    if (entry === -1) continue; // not a dependency of this consumer
    const line = lock.split("\n")[entry + 1] ?? "";
    if (!line.includes(integrity.get(dep))) fail(`${name}: ${dep} integrity does not match the packed tarball.`);
  }
  console.log(`[consumers] ${name}: @usecredo/* installed from ${registryUrl}; integrity matches the packed tarballs; no links`);
}

async function main() {
  if (!flag("--skip-build")) {
    log("Building the published packages");
    run("pnpm", ["exec", "turbo", "run", "build", ...PUBLISHED.map((p) => `--filter=@usecredo/${p}`)]);
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "credo-consumers-"));
  log(`Working in ${tmp}`);
  let registry;
  try {
    // 1. Pack.
    const tarballs = path.join(tmp, "tarballs");
    fs.mkdirSync(tarballs);
    for (const p of PUBLISHED) {
      run("pnpm", ["pack", "--pack-destination", tarballs], { cwd: path.join(repoRoot, "packages", p) });
    }
    const versions = new Map();
    const integrity = new Map();
    const files = fs.readdirSync(tarballs).filter((f) => f.endsWith(".tgz"));
    if (files.length !== PUBLISHED.length) fail(`Expected ${PUBLISHED.length} tarballs, found ${files.length}.`);
    for (const f of files) {
      const manifest = JSON.parse(capture("tar", ["-xOf", path.join(tarballs, f), "package/package.json"]));
      const text = JSON.stringify(manifest);
      if (text.includes("workspace:")) fail(`${f}: manifest still contains the workspace protocol.`);
      if (manifest.publishConfig?.registry) fail(`${f}: publishConfig.registry would redirect publishing.`);
      versions.set(manifest.name, manifest.version);
      integrity.set(manifest.name, `sha512-${createHash("sha512").update(fs.readFileSync(path.join(tarballs, f))).digest("base64")}`);
    }

    // 2. Local registry on loopback with no uplink for @usecredo/*.
    const port = await freePort();
    const url = `http://127.0.0.1:${port}/`;
    assertLocal(url);
    const config = path.join(tmp, "verdaccio.yaml");
    fs.writeFileSync(
      config,
      [
        `storage: ${path.join(tmp, "storage")}`,
        "web:",
        "  enable: false",
        "uplinks:",
        "  npmjs:",
        "    url: https://registry.npmjs.org/",
        "packages:",
        "  '@usecredo/*':",
        "    access: $all",
        "    publish: $all",
        "    unpublish: $all",
        "  '**':",
        "    access: $all",
        "    proxy: npmjs",
        "log: { type: stdout, format: pretty, level: warn }",
        "",
      ].join("\n"),
    );
    const verdaccioPkg = createRequire(path.join(repoRoot, "package.json")).resolve("verdaccio/package.json");
    const bin = JSON.parse(fs.readFileSync(verdaccioPkg, "utf8")).bin;
    const binPath = path.join(path.dirname(verdaccioPkg), typeof bin === "string" ? bin : bin.verdaccio);
    registry = spawn(process.execPath, [binPath, "--config", config, "--listen", `127.0.0.1:${port}`], {
      cwd: tmp,
      env: cleanEnv(),
      stdio: ["ignore", "inherit", "inherit"],
    });
    await waitForRegistry(url, registry);
    log(`Local registry ready at ${url}`);

    // 3. Publish the tarballs to the local registry only.
    const publishRc = path.join(tmp, "publish.npmrc");
    fs.writeFileSync(publishRc, `registry=${url}\n//127.0.0.1:${port}/:_authToken=local-only\n`);
    const emptyGlobal = path.join(tmp, "empty-global.npmrc");
    fs.writeFileSync(emptyGlobal, "");
    for (const f of files) {
      assertLocal(url);
      run(
        "npm",
        [
          "publish",
          path.join(tarballs, f),
          `--registry=${url}`,
          `--userconfig=${publishRc}`,
          `--globalconfig=${emptyGlobal}`,
          "--ignore-scripts",
          "--access=public",
          "--tag=latest",
        ],
        { env: cleanEnv({ npm_config_registry: url }) },
      );
    }

    // 4. Install, build and test each consumer in its own directory.
    for (const name of CONSUMERS) {
      log(`Consumer ${name}`);
      const dir = path.join(tmp, "work", name);
      copyConsumer(name, dir);
      rewriteManifest(dir, versions);
      writeWorkspaceFile(dir);
      fs.writeFileSync(path.join(dir, ".npmrc"), `registry=${url}\ncache-dir=${path.join(tmp, "pnpm-cache")}\n`);
      const env = cleanEnv({ npm_config_registry: url });
      run("pnpm", ["install", "--no-frozen-lockfile"], { cwd: dir, env });
      assertIsolated(dir, name, url, versions, integrity);
      run("pnpm", ["run", "build"], { cwd: dir, env });
      run("pnpm", ["run", "test"], { cwd: dir, env });
    }
    log(`OK: ${CONSUMERS.join(", ")} built from packed tarballs and passed their smoke tests`);
  } finally {
    if (registry && registry.exitCode === null) registry.kill("SIGTERM");
    if (flag("--keep")) console.log(`[consumers] kept ${tmp}`);
    else fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(`\n[consumers] FAILED: ${err.message}`);
  process.exit(1);
});
