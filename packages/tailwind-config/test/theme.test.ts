import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { compile } from "tailwindcss";
import { parseCss, type TokenTable } from "@usecredo/tokens";
import { buildThemeCss } from "../src/index";

const require = createRequire(import.meta.url);
const table = JSON.parse(readFileSync(require.resolve("@usecredo/tokens/table.json"), "utf8")) as TokenTable;
const tokensCss = readFileSync(require.resolve("@usecredo/tokens/tokens.css"), "utf8");

async function utilities(...classes: string[]) {
  const compiler = await compile(`${buildThemeCss(table)}\n@tailwind utilities;\n`);
  return compiler.build(classes);
}

describe("tailwind-config", () => {
  it("maps role utilities to the prefixed variables", async () => {
    const css = await utilities(
      "bg-surface-page",
      "text-content-primary",
      "border-border-default",
      "bg-actions-primary-default",
      "text-actions-primary-foreground",
      "ring-state-focus-ring",
      "rounded-md",
    );
    expect(css).toMatch(/\.bg-surface-page\s*\{\s*background-color:\s*var\(--cr-surface-page\)/);
    expect(css).toMatch(/\.text-content-primary\s*\{\s*color:\s*var\(--cr-content-primary\)/);
    expect(css).toMatch(/\.border-border-default\s*\{[^}]*var\(--cr-border-default\)/);
    expect(css).toMatch(/\.bg-actions-primary-default\s*\{\s*background-color:\s*var\(--cr-actions-primary-default\)/);
    expect(css).toMatch(/\.text-actions-primary-foreground\s*\{\s*color:\s*var\(--cr-actions-primary-foreground\)/);
    expect(css).toContain("var(--cr-state-focus-ring)");
    expect(css).toMatch(/\.rounded-md\s*\{\s*border-radius:\s*var\(--cr-radius-md\)/);
  });

  it("does not expose shadcn role names", async () => {
    const css = await utilities("bg-background", "text-foreground", "bg-primary", "bg-card", "border-input");
    expect(css.replace(/\/\*[\s\S]*?\*\//g, "").trim()).toBe("");
  });

  it("resolves bg-surface-page to a different value in light and dark", async () => {
    const css = await utilities("bg-surface-page");
    const variable = /var\((--[\w-]+)\)/.exec(css)?.[1];
    expect(variable).toBe("--cr-surface-page");
    const themes = parseCss(tokensCss);
    const light = themes.light.get(variable!);
    const dark = themes.dark.get(variable!);
    expect(light).toBeDefined();
    expect(dark).toBeDefined();
    expect(light).not.toBe(dark);
  });

  it("exposes every role", () => {
    const css = buildThemeCss(table);
    expect(css.match(/--color-/g)).toHaveLength(table.roles.length);
  });
});
