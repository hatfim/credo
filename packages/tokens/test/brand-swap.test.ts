import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { TokenFile } from "../src/model";
import { buildPairs, checkTheme, formatResult } from "../src/theme";
import { rolePaths } from "../src/model";
import { validateTokens } from "../src/validate";

// Decision 0005 (second-theme): the brand swap is proved with a fixture, not a second design.
// The fixture swaps `scale.primary` (the brand ramp) to the `color.indigo` palette in memory.
// The committed file is read only; it is never written.
type Loose = { [key: string]: Loose } & { $value?: string };
const load = () => JSON.parse(readFileSync(new URL("../generated/tokens.json", import.meta.url), "utf8")) as Loose;

/** Swap the ramp and re-derive the `alpha.primary.*` literals, which carry the RGB of one scale step. */
function swapToIndigo(f: Loose) {
  const indigo = f["Primitives/Default"].color.indigo as Loose;
  for (const step of Object.keys(f["Brand/Default"].scale.primary)) {
    f["Brand/Default"].scale.primary[step].$value = `{color.indigo.${step}}`;
  }
  for (const [set, step] of [["Semantic/Light", "700"], ["Semantic/Dark", "500"]] as const) {
    for (const [k, t] of Object.entries<Loose>(f[set].alpha.primary)) {
      if (!k.startsWith("$")) t.$value = `${indigo[step].$value}${String(t.$value).slice(7)}`;
    }
  }
  return f;
}

const set = (f: Loose, sets: string[], path: string, value: string) => {
  for (const s of sets) {
    let node = f[s];
    for (const part of path.split(".")) node = node[part];
    node.$value = value;
  }
};
const BOTH = ["Semantic/Light", "Semantic/Dark"];
const failures = (f: Loose) => checkTheme(f as TokenFile).failures.map(formatResult);

describe("brand swap to indigo (decision 0005)", () => {
  it("has the indigo palette in the committed file", () => {
    expect(Object.keys(load()["Primitives/Default"].color.indigo)).toHaveLength(13);
  });

  it("is structurally valid once the alpha.primary literals follow the new ramp", () => {
    expect(validateTokens(swapToIndigo(load()))).toEqual([]);
  });

  it("is rejected by the validator when the alpha.primary literals are left on the old brand colour", () => {
    const f = load();
    for (const step of Object.keys(f["Brand/Default"].scale.primary)) {
      f["Brand/Default"].scale.primary[step].$value = `{color.indigo.${step}}`;
    }
    const codes = validateTokens(f).map((i) => i.code);
    expect(codes.length).toBe(12);
    expect(new Set(codes)).toEqual(new Set(["alpha-source"]));
  });

  it("builds pairs for the swapped file", () => {
    expect(buildPairs(rolePaths(swapToIndigo(load()) as TokenFile)).length).toBeGreaterThan(0);
  });

  // Caveat (decision 0005): actions.primary.foreground is hard-wired to the dark ink
  // (scale.neutral.1200), tuned for the lime brand. Indigo is darker, so the strict gate fails.
  it("fails exactly the pairs the dark-ink foreground cannot serve, and the gate stays strict", () => {
    expect(failures(swapToIndigo(load()))).toEqual([
      "light: actions.primary text on default = 3.87:1 (needs 4.5:1)",
      "light: actions.primary text on pressed = 1.87:1 (needs 4.5:1)",
      "dark: actions.primary text on default = 3.87:1 (needs 4.5:1)",
      "dark: actions.primary text on pressed = 1.87:1 (needs 4.5:1)",
      "dark: border.interactive-pressed on surface.page = 1.87:1 (needs 3:1)",
      "dark: border.interactive-pressed on surface.container = 1.68:1 (needs 3:1)",
      "dark: border.interactive-pressed on surface.container-subtle = 1.79:1 (needs 3:1)",
      "dark: border.interactive-pressed on surface.container-elevated = 1.51:1 (needs 3:1)",
    ]);
  });

  it("a light foreground alone is not enough: hover (indigo 400) then fails", () => {
    const f = swapToIndigo(load());
    set(f, BOTH, "actions.primary.foreground", "{color.white}");
    expect(failures(f).filter((x) => x.includes("actions.primary"))).toEqual([
      "light: actions.primary text on hover = 3.11:1 (needs 4.5:1)",
      "dark: actions.primary text on hover = 3.11:1 (needs 4.5:1)",
    ]);
  });

  it("passes the strict gate with the documented overrides", () => {
    const f = swapToIndigo(load());
    set(f, BOTH, "actions.primary.foreground", "{color.white}");
    set(f, BOTH, "actions.primary.hover", "{scale.primary.600}");
    set(f, BOTH, "actions.primary.pressed", "{scale.primary.700}");
    set(f, ["Semantic/Dark"], "border.interactive-pressed", "{scale.primary.300}");
    expect(validateTokens(f)).toEqual([]);
    const r = checkTheme(f as TokenFile);
    expect(r.issues).toEqual([]);
    expect(r.failures).toEqual([]);
  });

  it("never touches the baseline or the committed file", () => {
    const baseline = JSON.parse(readFileSync(new URL("../contrast-baseline.json", import.meta.url), "utf8"));
    expect(baseline).toEqual({ exceptions: [] });
    expect(load()["Brand/Default"].scale.primary["500"].$value).toBe("{color.brand.500}");
  });
});
