import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "tsup";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as client from "./index";
import * as server from "./server";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("@usecredo/icons", () => {
  it("exports the same icon names from both entries", () => {
    const names = (m: object) => Object.keys(m).sort();
    expect(names(server)).toEqual(names(client));
    expect(names(client)).toContain("CircleNotchIcon");
  });

  it("renders the server entry to a string without a provider or context", () => {
    const html = renderToString(createElement(server.CircleNotchIcon, { size: 16, "aria-hidden": true }));
    expect(html).toContain("<svg");
    expect(html).toContain('width="16"');
    expect(html).toContain('aria-hidden="true"');
  });

  it("renders the client entry to a string", () => {
    expect(renderToString(createElement(client.CircleNotchIcon))).toContain("<svg");
  });

  // Builds into a temp dir so it does not race with the package build, and fails if the build fails.
  it("marks only the client entry with use client", async () => {
    const outDir = mkdtempSync(path.join(tmpdir(), "icons-"));
    await build({ config: path.join(root, "tsup.config.ts"), outDir, dts: false, sourcemap: false, silent: true });
    expect(readFileSync(path.join(outDir, "index.js"), "utf8").startsWith('"use client"')).toBe(true);
    expect(readFileSync(path.join(outDir, "server.js"), "utf8")).not.toContain("use client");
  }, 30_000);
});
