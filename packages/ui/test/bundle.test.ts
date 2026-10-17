// @vitest-environment node
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";
import { build as tsupBuild } from "tsup";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src");

/** Bundles one component entry the way a consumer's bundler would, with React external. */
async function bundle(entry: string) {
  const result = await build({
    entryPoints: [path.join(src, entry)],
    bundle: true,
    write: false,
    minify: true,
    format: "esm",
    platform: "browser",
    metafile: true,
    external: ["react", "react-dom", "react/jsx-runtime"],
    jsx: "automatic",
    logLevel: "silent",
  });
  const inputs = Object.keys(result.metafile.inputs).map((p) => path.resolve(root, p));
  const code = result.outputFiles[0]?.contents ?? new Uint8Array();
  return { inputs, gzip: gzipSync(code).length };
}

// Directories under src that are not components.
const shared = new Set(["lib"]);

describe("Button bundle (DST-02, DST-03)", () => {
  it("pulls in no other component", async () => {
    const { inputs } = await bundle("button/index.ts");
    const ownSource = inputs.filter((p) => p.startsWith(src + path.sep));
    const dirs = new Set(ownSource.map((p) => path.relative(src, p).split(path.sep)[0]));
    const foreign = [...dirs].filter((d) => d !== "button" && !shared.has(d ?? ""));
    expect(foreign, `Button imports other components: ${foreign.join(", ")}`).toEqual([]);
  });

  it("stays within its size budget", async () => {
    const { gzip } = await bundle("button/index.ts");
    console.info(`Button bundle (minified + gzip, react external): ${gzip} bytes`);
    // Measured size plus headroom; raise only with a reason in the pull request.
    expect(gzip).toBeLessThan(BUDGET_GZIP_BYTES);
  });

  it("is a no-side-effect module", async () => {
    const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
      sideEffects: unknown;
      exports: Record<string, unknown>;
    };
    expect(pkg.sideEffects).toBe(false);
    expect(Object.keys(pkg.exports)).toContain("./button");
    const before = Object.keys(globalThis).length;
    await import("../src/button/index");
    expect(Object.keys(globalThis).length).toBe(before);
  });

  it("keeps the use client directive in the built entry", async () => {
    // Builds into a temp dir so it does not race with the package build.
    const outDir = mkdtempSync(path.join(tmpdir(), "ui-"));
    await tsupBuild({ config: path.join(root, "tsup.config.ts"), outDir, dts: false, sourcemap: false, silent: true });
    const built = readFileSync(path.join(outDir, "button.js"), "utf8");
    expect(built.startsWith('"use client";')).toBe(true);
  }, 30_000);
});

const BUDGET_GZIP_BYTES = 14_000;
