import { MODES, SETS, type Mode } from "./constants";
import { composite, contrastRatio, isHexColor, parseHex } from "./color";
import { TokenContext, flattenSet, rolePaths, type TokenFile } from "./model";
import type { Issue } from "./validate";

export const TEXT_RATIO = 4.5;
export const UI_RATIO = 3;

export interface Pair {
  label: string;
  kind: "text" | "ui";
  fg: string;
  bg: string;
  /** When set, `bg` is translucent and is composited over this role first. */
  bgOver?: string;
}

export interface PairResult {
  mode: Mode;
  pair: Pair;
  ratio: number;
  required: number;
  pass: boolean;
  excepted: boolean;
}

/** A documented exception. The baseline starts empty and only grows with a written reason. */
export interface BaselineEntry {
  mode?: Mode;
  fg: string;
  bg: string;
  reason: string;
}

/**
 * Roles every pair depends on. A missing one is an error, never a silently skipped pair.
 * Only the pairs built from roles discovered in the file stay optional: extra surface or
 * ring variants, extra actions or feedback families, and the alpha tint pairs.
 */
export function requiredRoles(): string[] {
  const out: string[] = [];
  const surfaces = ["page", "container", "container-subtle", "container-elevated", "overlay"];
  for (const s of surfaces) out.push(`surface.${s}`);
  for (const s of surfaces.slice(1)) out.push(`surface.${s}-hover`, `surface.${s}-pressed`);
  for (const t of ["primary", "secondary", "tertiary", "link", "link-subtle", "link-external", "link-danger"]) out.push(`content.${t}`);
  for (const f of ["background", "foreground", "placeholder", "border", "border-hover", "border-focus"]) out.push(`field.${f}`);
  for (const v of ["primary", "secondary", "destructive"]) {
    for (const r of ["default", "hover", "pressed", "foreground", "subtle", "subtle-hover", "subtle-pressed", "subtle-foreground"]) out.push(`actions.${v}.${r}`);
  }
  for (const v of ["error", "success", "warning", "info"]) {
    for (const r of ["default", "hover", "pressed", "foreground", "content", "container", "container-hover", "container-pressed"]) out.push(`feedback.${v}.${r}`);
  }
  for (const r of ["ring", "ring-error", "ring-success", "ring-warning"]) out.push(`state.focus.${r}`);
  for (const s of ["loading", "read-only"]) out.push(`state.${s}.foreground`, `state.${s}.background`);
  for (const r of ["strong", "strong-hover", "interactive", "interactive-hover", "interactive-pressed"]) out.push(`border.${r}`);
  return out;
}

const isState = (p: string) => /-(hover|pressed)$/.test(p);

/**
 * Foreground/background pairs derived (the `has` guards below only skip optional pairs; see requiredRoles) from the role list. Disabled states are exempt
 * from WCAG contrast and are not checked.
 */
export function buildPairs(roles: string[]): Pair[] {
  const has = (p: string) => roles.includes(p);
  const pairs: Pair[] = [];
  const text = (label: string, fg: string, bg: string, bgOver?: string) => {
    if (has(fg) && has(bg)) pairs.push({ label, kind: "text", fg, bg, ...(bgOver ? { bgOver } : {}) });
  };
  const ui = (label: string, fg: string, bg: string) => {
    if (has(fg) && has(bg)) pairs.push({ label, kind: "ui", fg, bg });
  };

  const surfaces = roles.filter((r) => r.startsWith("surface.") && r !== "surface.scrim");
  const baseSurfaces = surfaces.filter((s) => !isState(s));

  for (const s of surfaces) {
    for (const tier of ["primary", "secondary", "tertiary"]) text(`content.${tier} on ${s}`, `content.${tier}`, s);
  }
  for (const s of baseSurfaces) {
    for (const link of ["link", "link-subtle", "link-external", "link-danger"]) text(`content.${link} on ${s}`, `content.${link}`, s);
  }

  const variants = roles.filter((r) => /^actions\.[^.]+\.default$/.test(r)).map((r) => r.split(".")[1]!);
  for (const v of variants) {
    for (const st of ["default", "hover", "pressed"]) text(`actions.${v} text on ${st}`, `actions.${v}.foreground`, `actions.${v}.${st}`);
    for (const st of ["subtle", "subtle-hover", "subtle-pressed"]) text(`actions.${v} subtle text on ${st}`, `actions.${v}.subtle-foreground`, `actions.${v}.${st}`);
  }

  const feedback = [...new Set(roles.filter((r) => r.startsWith("feedback.")).map((r) => r.split(".")[1]!))];
  for (const f of feedback) {
    for (const st of ["container", "container-hover", "container-pressed"]) text(`feedback.${f}.content on ${st}`, `feedback.${f}.content`, `feedback.${f}.${st}`);
    for (const st of ["default", "hover", "pressed"]) text(`feedback.${f} text on ${st}`, `feedback.${f}.foreground`, `feedback.${f}.${st}`);
  }

  text("field.foreground on field.background", "field.foreground", "field.background");
  text("field.placeholder on field.background", "field.placeholder", "field.background");
  ui("field.border on field.background", "field.border", "field.background");
  ui("field.border-focus on field.background", "field.border-focus", "field.background");
  for (const s of ["loading", "read-only"]) text(`state.${s} text`, `state.${s}.foreground`, `state.${s}.background`);

  for (const ring of roles.filter((r) => r.startsWith("state.focus.ring") && r !== "state.focus.ring-offset")) {
    for (const s of baseSurfaces) ui(`${ring} on ${s}`, ring, s);
  }

  // Control borders must be visible on every base surface (3:1). `border.default*` and
  // `border.subtle*` are decorative dividers and are deliberately not gated: components must
  // never rely on them as the only visible boundary of a control.
  const controlBorders = roles.filter((r) => /^(field\.border|border\.(interactive|strong))/.test(r));
  for (const b of controlBorders) {
    for (const s of baseSurfaces.filter((x) => x !== "surface.overlay")) {
      if (!pairs.some((p) => p.fg === b && p.bg === s)) ui(`${b} on ${s}`, b, s);
    }
  }

  for (const a of roles.filter((r) => /^alpha\.(neutral|primary|destructive)\.(5|10|20)$/.test(r))) {
    for (const tier of ["primary", "secondary"]) text(`content.${tier} on ${a} over surface.page`, `content.${tier}`, a, "surface.page");
  }
  return pairs;
}

function colorOf(ctx: TokenContext, path: string): string | undefined {
  const r = ctx.resolve(path);
  return !r.error && isHexColor(r.value) ? (r.value as string) : undefined;
}

export interface ThemeReport {
  issues: Issue[];
  results: PairResult[];
  failures: PairResult[];
  checks: Record<Mode, number>;
}

const DIMENSION = /^-?(\d+|\d*\.\d+)(px|rem|em|%)$|^0$/;

function valueTypeOk(type: string | undefined, v: unknown): boolean {
  switch (type) {
    case "color":
      return isHexColor(v);
    case "dimension":
      return typeof v === "string" && DIMENSION.test(v);
    case "letterSpacing":
      return typeof v === "string" && DIMENSION.test(v);
    case "fontWeights":
      return (typeof v === "number" || (typeof v === "string" && /^\d{3}$/.test(v))) && Number(v) >= 1 && Number(v) <= 1000;
    case "fontFamilies":
      return typeof v === "string" && v.trim().length > 0;
    default:
      return true;
  }
}

/** Completeness, value types and strict WCAG 2.2 AA contrast for every mode. */
export function checkTheme(file: TokenFile, baseline: BaselineEntry[] = []): ThemeReport {
  const issues: Issue[] = [];
  const results: PairResult[] = [];
  const checks = { light: 0, dark: 0 } as Record<Mode, number>;
  const roles = rolePaths(file);
  const pairs = buildPairs(roles);
  const used = new Set<BaselineEntry>();

  for (const mode of MODES) {
    const set = mode === "light" ? SETS.light : SETS.dark;
    const ctx = TokenContext.forMode(file, mode);

    // Completeness and value types.
    const own = new Set(flattenSet(set, file[set]).map((t) => t.path));
    for (const r of requiredRoles()) {
      if (!own.has(r)) issues.push({ severity: "error", code: "required-role", set, path: r, message: `Required role ${r} missing in ${mode} mode.` });
    }
    for (const r of roles) {
      if (!own.has(r)) issues.push({ severity: "error", code: "incomplete", set, path: r, message: `Role is missing in ${mode} mode.` });
    }
    for (const t of flattenSet(set, file[set])) {
      const r = ctx.resolve(t.path);
      if (r.error) {
        issues.push({ severity: "error", code: "incomplete", set, path: t.path, message: `Does not resolve (${r.error} at {${r.at}}).` });
      } else if (!valueTypeOk(t.type, r.value)) {
        issues.push({ severity: "error", code: "value-type", set, path: t.path, message: `Resolved value ${JSON.stringify(r.value)} is not a valid ${t.type}.` });
      }
    }

    // Contrast.
    for (const pair of pairs) {
      const fg = colorOf(ctx, pair.fg);
      const bg = colorOf(ctx, pair.bg);
      const over = pair.bgOver ? colorOf(ctx, pair.bgOver) : undefined;
      if (!fg || !bg || (pair.bgOver && !over)) {
        issues.push({ severity: "error", code: "incomplete", set, path: pair.label, message: "Pair has a role that is missing or does not resolve to a colour." });
        continue;
      }
      const bgRgba = parseHex(bg)!;
      const opaqueBg = over ? composite(bgRgba, parseHex(over)!) : bgRgba;
      const fgRgba = parseHex(fg)!;
      const fgOpaque = fgRgba.a < 1 ? composite(fgRgba, opaqueBg) : fgRgba;
      const ratio = contrastRatio(fgOpaque, opaqueBg);
      const required = pair.kind === "text" ? TEXT_RATIO : UI_RATIO;
      const entry = baseline.find((b) => b.fg === pair.fg && b.bg === pair.bg && (!b.mode || b.mode === mode));
      if (entry && ratio < required) used.add(entry);
      checks[mode]++;
      results.push({ mode, pair, ratio, required, pass: ratio >= required, excepted: !!entry });
    }
  }

  for (const b of baseline) {
    if (!used.has(b)) issues.push({ severity: "warning", code: "stale-baseline", path: `${b.fg} on ${b.bg}`, message: "Baseline exception matches no failing pair. Remove it." });
  }
  const failures = results.filter((r) => !r.pass && !r.excepted);
  return { issues, results, failures, checks };
}

export function formatResult(r: PairResult): string {
  return `${r.mode}: ${r.pair.label} = ${r.ratio.toFixed(2)}:1 (needs ${r.required}:1)`;
}
