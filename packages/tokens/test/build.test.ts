import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { buildArtifacts, type Artifacts, type TokenTable } from "../src/build";
import { rolePaths } from "../src/model";
import { TYPOGRAPHY_BREAKPOINT_PX } from "../src/constants";
import { validateTokens } from "../src/validate";
import { makeValid } from "./fixtures/valid";

let art: Artifacts;
beforeAll(async () => {
  art = await buildArtifacts(makeValid());
});

describe("buildArtifacts (fixture)", () => {
  it("emits the CSS", () => {
    expect(art.css).toMatchSnapshot();
  });

  it("emits type declarations", () => {
    expect(art.types).toMatchSnapshot();
  });

  it("scopes the themes by attribute and switches colours", () => {
    expect(art.css).toContain(':root, [data-theme="light"] {');
    expect(art.css).toContain('[data-theme="dark"] {');
    const table = JSON.parse(art.table) as TokenTable;
    const page = table.roles.find((r) => r.path === "surface.page")!;
    expect(page.value.light).not.toBe(page.value.dark);
    expect(page.variable).toBe("--cr-surface-page");
  });

  it("describes a schema that requires every role", () => {
    const schema = JSON.parse(art.schema) as { required: string[] };
    expect(schema.required).toContain("surface");
  });
});

describe("buildArtifacts (real token file)", () => {
  it("builds from the owner's file", async () => {
    const file = JSON.parse(readFileSync(new URL("../generated/tokens.json", import.meta.url), "utf8"));
    expect(validateTokens(file).filter((i) => i.severity === "error")).toEqual([]);
    const real = await buildArtifacts(file);
    const table = JSON.parse(real.table) as TokenTable;
    expect(table.roles.map((r) => r.path)).toEqual(rolePaths(file));
    expect(table.roles.length).toBeGreaterThan(0);
    expect(real.css).toContain("--cr-surface-page:");
    expect(real.css).not.toMatch(/\bundefined\b|\[object Object\]|\{[a-z]+\./);
    // Decision 0005: mobile typography below 768px, desktop at 768px and above.
    expect(TYPOGRAPHY_BREAKPOINT_PX).toBe(768);
    expect(real.css).toContain("@media (max-width: 767.98px) {");
  });
});
