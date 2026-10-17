import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { composite, contrastRatio, parseHex } from "../src/color";
import type { TokenFile } from "../src/model";
import { buildPairs, checkTheme, formatResult } from "../src/theme";
import { makeValid } from "./fixtures/valid";

describe("contrast maths", () => {
  it("matches the WCAG reference values", () => {
    const black = parseHex("#000000")!;
    const white = parseHex("#ffffff")!;
    expect(contrastRatio(black, white)).toBeCloseTo(21, 5);
    expect(contrastRatio(parseHex("#767676")!, white)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(parseHex("#777777")!, white)).toBeLessThan(4.5);
  });

  it("composites translucent colours over a backdrop", () => {
    const c = composite({ r: 0, g: 0, b: 0, a: 0.5 }, { r: 255, g: 255, b: 255, a: 1 });
    expect([Math.round(c.r), Math.round(c.g), Math.round(c.b)]).toEqual([128, 128, 128]);
  });
});

describe("checkTheme", () => {
  it("passes the valid fixture with an empty baseline", () => {
    const r = checkTheme(makeValid());
    expect(r.issues).toEqual([]);
    expect(r.failures).toEqual([]);
    expect(r.results.length).toBeGreaterThan(0);
  });

  it("fails a text pair under 4.5:1 and names the pair", () => {
    const f = makeValid();
    f["Semantic/Light"].content.primary.$value = "{scale.neutral.500}";
    const r = checkTheme(f);
    expect(r.failures.map((x) => x.pair.label)).toContain("content.primary on surface.page");
    expect(formatResult(r.failures[0]!)).toMatch(/^light: content\.primary on surface\.page = 3\.\d\d:1 \(needs 4\.5:1\)$/);
  });

  it("fails a UI boundary under 3:1 in dark mode only", () => {
    const f = makeValid();
    f["Semantic/Dark"].field.border.$value = "{scale.neutral.900}";
    const r = checkTheme(f);
    expect(r.failures.every((x) => x.mode === "dark" && x.pair.kind === "ui")).toBe(true);
    expect(r.failures.length).toBeGreaterThan(0);
  });

  it("accepts a documented exception and flags a stale one", () => {
    const f = makeValid();
    f["Semantic/Light"].content.tertiary.$value = "{scale.neutral.500}";
    const exception = { mode: "light" as const, fg: "content.tertiary", bg: "surface.page", reason: "test" };
    expect(checkTheme(f).failures.length).toBeGreaterThan(0);
    const withBaseline = checkTheme(f, [exception, { fg: "content.primary", bg: "surface.page", reason: "stale" }]);
    expect(withBaseline.failures.map((x) => x.pair.label)).not.toContain("content.tertiary on surface.page");
    expect(withBaseline.issues.map((i) => i.code)).toContain("stale-baseline");
  });

  it("checks feedback foreground on default, hover and pressed fills", () => {
    const f = makeValid();
    for (const set of ["Semantic/Light", "Semantic/Dark"]) {
      const e = f[set].feedback.error;
      e.hover = { ...e.default };
      e.pressed = { ...e.default };
      e.foreground = { $type: "color", $value: "{color.white}" };
    }
    expect(checkTheme(f).failures).toEqual([]);
    f["Semantic/Light"].feedback.error.foreground.$value = "{scale.destructive.500}";
    const labels = checkTheme(f).failures.map((x) => `${x.mode}: ${x.pair.label}`);
    expect(labels).toEqual([
      "light: feedback.error text on default",
      "light: feedback.error text on hover",
      "light: feedback.error text on pressed",
    ]);
  });

  it("gates control borders on every base surface and skips decorative borders", () => {
    const roles = [
      "surface.page", "surface.container", "surface.container-subtle", "surface.container-elevated", "surface.overlay",
      "field.border", "field.border-hover", "border.strong", "border.interactive-pressed", "border.default", "border.subtle",
    ];
    const fgs = new Set(buildPairs(roles).filter((p) => p.kind === "ui").map((p) => p.fg));
    expect([...fgs].sort()).toEqual(["border.interactive-pressed", "border.strong", "field.border", "field.border-hover"]);
    const on = buildPairs(roles).filter((p) => p.fg === "border.strong").map((p) => p.bg);
    expect(on).toEqual(["surface.page", "surface.container", "surface.container-subtle", "surface.container-elevated"]);
  });

  it("fails a weak control border", () => {
    const f = makeValid();
    f["Semantic/Light"].border.strong = { $type: "color", $value: "{scale.neutral.50}" };
    f["Semantic/Dark"].border.strong = { $type: "color", $value: "{scale.neutral.900}" };
    const labels = checkTheme(f).failures.map((x) => x.pair.label);
    expect(labels).toContain("border.strong on surface.container");
  });

  it("fails a missing required role instead of skipping its pairs", () => {
    for (const [role, group, a, b] of [
      ["border.strong", "border", "strong", ""],
      ["feedback.error.foreground", "feedback", "error", "foreground"],
    ] as const) {
      const f = makeValid();
      f["Semantic/Light"][group][a] = { ...f["Semantic/Light"][group][a] };
      if (b) delete f["Semantic/Light"][group][a][b];
      else delete f["Semantic/Light"][group][a];
      const messages = checkTheme(f).issues.filter((i) => i.code === "required-role").map((i) => i.message);
      expect(messages).toContain(`Required role ${role} missing in light mode.`);
      expect(messages).not.toContain(`Required role ${role} missing in dark mode.`);
    }
  });

  it("reports incomplete themes", () => {
    const f = makeValid();
    delete f["Semantic/Dark"].content.secondary;
    expect(checkTheme(f).issues).toContainEqual(
      expect.objectContaining({ code: "incomplete", set: "Semantic/Dark", path: "content.secondary" }),
    );
  });

  it("reports values that are not valid for their type", () => {
    const f = makeValid();
    f["Primitives/Default"]["font-size"]["40"].$value = "big";
    f["Semantic/Light"].surface.container.$value = "{font-size.40}";
    expect(checkTheme(f).issues.some((i) => i.code === "value-type")).toBe(true);
  });

  it("composites alpha backgrounds over the page before comparing", () => {
    expect(buildPairs(["content.primary", "surface.page", "alpha.neutral.5"])).toContainEqual(
      expect.objectContaining({ bg: "alpha.neutral.5", bgOver: "surface.page" }),
    );
  });
});

describe("the real token file", () => {
  const file = JSON.parse(readFileSync(new URL("../generated/tokens.json", import.meta.url), "utf8")) as TokenFile;
  it("passes strict contrast with an empty baseline", () => {
    const baseline = JSON.parse(readFileSync(new URL("../contrast-baseline.json", import.meta.url), "utf8")) as {
      exceptions: unknown[];
    };
    expect(baseline.exceptions).toEqual([]);
    const r = checkTheme(file);
    expect(r.issues).toEqual([]);
    expect(r.failures.map(formatResult)).toEqual([]);
  });
});
