// @vitest-environment node
// Asserts on the production build output, so a missing stylesheet or a broken override fails here.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import postcss, { type Declaration, type Root } from "postcss";
import { beforeAll, describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const assets = path.join(root, "dist", "assets");
const norm = (s: string) => s.replace(/["'\s]/g, "");
const val = (s: string) => s.trim().toLowerCase().replace(/(^|[^\d])0\./g, "$1.");

function declarations(css: Root) {
  const out: { prop: string; value: string; selector: string }[] = [];
  css.walkDecls((d: Declaration) => {
    const parent = d.parent;
    out.push({ prop: d.prop, value: d.value, selector: parent && "selector" in parent ? norm(String(parent.selector)) : "" });
  });
  return out;
}

let built: Root;
let tokens: Root;
let decls: ReturnType<typeof declarations>;
let tokenDecls: ReturnType<typeof declarations>;
const appCss = readFileSync(path.join(root, "src", "styles.css"), "utf8");

beforeAll(() => {
  if (!existsSync(assets)) throw new Error("dist/assets is missing: run `pnpm build` before `pnpm test`.");
  const file = readdirSync(assets).find((f) => f.endsWith(".css"));
  if (!file) throw new Error("The production build produced no stylesheet.");
  built = postcss.parse(readFileSync(path.join(assets, file), "utf8"));
  const tokensPath = createRequire(import.meta.url).resolve("@usecredo/tokens/tokens.css");
  tokens = postcss.parse(readFileSync(tokensPath, "utf8"));
  decls = declarations(built);
  tokenDecls = declarations(tokens);
});

const utility = (cls: string) => decls.filter((d) => d.selector === `.${cls}`);

describe("vite consumer: production build resolves the Credo contract", () => {
  it("resolves tailwind-config utilities against token variables (P1-11)", () => {
    expect(utility("bg-surface-page").map((d) => d.value)).toContain("var(--cr-surface-page)");
    expect(utility("text-content-primary").map((d) => d.value)).toContain("var(--cr-content-primary)");
    expect(utility("bg-actions-primary-default").map((d) => d.value)).toContain("var(--cr-actions-primary-default)");
    expect(utility("rounded-md").map((d) => d.value)).toContain("var(--cr-radius-md)");
  });

  it("generated Button utilities by scanning the installed package", () => {
    // Built from parts so Tailwind's source scan cannot find these names in this test file.
    expect(utility(["inline", "flex"].join("-")).length).toBeGreaterThan(0);
    expect(utility(["bg", "actions", "secondary", "default"].join("-")).length).toBeGreaterThan(0);
  });

  it("ships both theme blocks of the token stylesheet", () => {
    const sels = decls.map((d) => d.selector);
    expect(sels.some((s) => s.includes("[data-theme=light]"))).toBe(true);
    expect(sels.some((s) => s.includes("[data-theme=dark]"))).toBe(true);
  });
});

describe("vite consumer: coexistence with the app's own Tailwind and variables (DST-09)", () => {
  it("keeps every Credo variable exactly as the token stylesheet declares it", () => {
    const credo = (list: typeof decls) => list.filter((d) => d.prop.startsWith("--cr-"));
    const expected = credo(tokenDecls);
    expect(expected.length).toBeGreaterThan(50);
    expect(credo(decls).length).toBe(expected.length);
    // The app declares no --cr- variable of its own and overrides none.
    expect(appCss.match(/^\s*--cr-[\w-]+\s*:/gm)).toBeNull();
  });

  it("keeps the app's own variables and does not let Credo redefine them", () => {
    for (const name of ["--background", "--foreground", "--primary", "--primary-foreground", "--radius"]) {
      const found = decls.filter((d) => d.prop === name);
      expect(found, name).toHaveLength(1);
      const expected = new RegExp(`${name}:\\s*([^;]+);`).exec(appCss)?.[1]?.trim();
      expect(val(found[0]!.value), name).toBe(val(expected!));
      expect(found[0]!.selector, name).not.toContain("data-theme");
    }
  });

  it("generates the app's own utilities from its own theme next to Credo's", () => {
    expect(utility("bg-primary").map((d) => d.value)).toContain("var(--primary)");
    expect(utility("bg-background").map((d) => d.value)).toContain("var(--background)");
    expect(utility("text-brand").map((d) => d.value.toLowerCase())).toContain("#268bd2");
    expect(decls.some((d) => d.selector === ".app-card" && d.prop === "border-radius" && d.value === "var(--radius)")).toBe(true);
    // Credo and app color namespaces stay disjoint: no utility takes the other's variable.
    expect(utility("bg-primary").some((d) => d.value.includes("--cr-"))).toBe(false);
    expect(utility("bg-actions-primary-default").some((d) => d.value.includes("var(--primary)"))).toBe(false);
  });
});
