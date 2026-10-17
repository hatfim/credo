import type { Artifacts, TokenTable } from "./build";
import { cssVariable } from "./naming";
import { ROLES_END, ROLES_START, renderRoleSection } from "./contract";
import { rolePaths, type TokenFile } from "./model";
import type { Issue } from "./validate";

type Decls = Map<string, string>;
interface ParsedCss {
  light: Decls;
  dark: Decls;
  root: Decls;
  mobile: Decls;
}

export function parseCss(css: string): ParsedCss {
  const out: ParsedCss = { light: new Map(), dark: new Map(), root: new Map(), mobile: new Map() };
  const stack: string[] = [];
  for (const line of css.split("\n")) {
    const open = /^\s*(.+?)\s*\{\s*$/.exec(line);
    if (open) {
      stack.push(open[1]!);
      continue;
    }
    if (/^\s*\}\s*$/.test(line)) {
      stack.pop();
      continue;
    }
    const decl = /^\s*(--[\w-]+):\s*(.+?);\s*(?:\/\*.*\*\/)?\s*$/.exec(line);
    if (!decl) continue;
    const inMedia = stack.some((s) => s.startsWith("@media"));
    const sel = stack[stack.length - 1] ?? "";
    const target = inMedia
      ? out.mobile
      : sel.includes('[data-theme="light"]')
        ? out.light
        : sel.includes('[data-theme="dark"]')
          ? out.dark
          : out.root;
    target.set(decl[1]!, decl[2]!);
  }
  return out;
}

const unionMembers = (types: string, name: string): string[] => {
  const m = new RegExp(`export type ${name} =([^;]*);`).exec(types);
  return m ? [...m[1]!.matchAll(/"([^"]+)"/g)].map((x) => x[1]!) : [];
};

function schemaLeaves(node: unknown, path: string[] = []): string[] {
  const props = (node as { properties?: Record<string, unknown> }).properties;
  if (!props) return [];
  if ("$value" in props) return [path.join(".")];
  return Object.entries(props).flatMap(([k, v]) => schemaLeaves(v, [...path, k]));
}

/**
 * CSS, types, schema, the docs table and the contract document must all say the same
 * thing as the token file. Returns one issue for every disagreement.
 */
export function checkConsistency(a: Artifacts, file: TokenFile, contractDoc?: string): Issue[] {
  const issues: Issue[] = [];
  const add = (code: string, message: string, path?: string) =>
    issues.push({ severity: "error", code, message, ...(path ? { path } : {}) });
  const diff = (label: string, expected: string[], actual: string[]) => {
    const e = new Set(expected);
    const g = new Set(actual);
    for (const x of e) if (!g.has(x)) add("diverged", `${label} is missing ${x}.`, x);
    for (const x of g) if (!e.has(x)) add("diverged", `${label} has ${x}, which the token file does not define.`, x);
  };

  const roles = rolePaths(file);
  const table = JSON.parse(a.table) as TokenTable;
  diff("Docs table", roles, table.roles.map((r) => r.path));
  for (const r of table.roles) {
    if (r.variable !== cssVariable(r.path)) add("diverged", `Docs table variable ${r.variable} does not follow the naming rule.`, r.path);
  }

  const css = parseCss(a.css);
  diff("CSS (light)", table.roles.map((r) => r.variable), [...css.light.keys()]);
  diff("CSS (dark)", table.roles.map((r) => r.variable), [...css.dark.keys()]);
  for (const r of table.roles) {
    if (css.light.has(r.variable) && css.light.get(r.variable) !== r.value.light) {
      add("diverged", `CSS light value ${css.light.get(r.variable)} differs from the docs table (${r.value.light}).`, r.path);
    }
    if (css.dark.has(r.variable) && css.dark.get(r.variable) !== r.value.dark) {
      add("diverged", `CSS dark value ${css.dark.get(r.variable)} differs from the docs table (${r.value.dark}).`, r.path);
    }
  }
  diff("CSS (:root scales and typography)", [...table.scales.map((s) => s.variable), ...table.typography.map((t) => t.variable)], [...css.root.keys()]);
  diff("CSS (mobile typography)", table.typography.map((t) => t.variable), [...css.mobile.keys()]);
  for (const s of table.scales) {
    if (css.root.has(s.variable) && css.root.get(s.variable) !== s.value) add("diverged", `CSS value ${css.root.get(s.variable)} differs from the docs table (${s.value}).`, s.path);
  }
  for (const t of table.typography) {
    if (css.root.has(t.variable) && css.root.get(t.variable) !== t.desktop) add("diverged", `CSS desktop value differs from the docs table for ${t.variable}.`, t.path);
    if (css.mobile.has(t.variable) && css.mobile.get(t.variable) !== t.mobile) add("diverged", `CSS mobile value differs from the docs table for ${t.variable}.`, t.path);
  }

  diff("Types RoleName", roles, unionMembers(a.types, "RoleName"));
  diff("Types CssVariable", roles.map(cssVariable), unionMembers(a.types, "CssVariable"));
  diff("Types ScaleVariable", table.scales.map((s) => s.variable), unionMembers(a.types, "ScaleVariable"));
  diff("Schema", roles, schemaLeaves(JSON.parse(a.schema)));

  if (contractDoc !== undefined) {
    const s = contractDoc.indexOf(ROLES_START);
    const e = contractDoc.indexOf(ROLES_END);
    if (s === -1 || e === -1) add("diverged", "Contract document has no generated role section.");
    else if (contractDoc.slice(s + ROLES_START.length, e).trim() !== renderRoleSection(file)) {
      add("diverged", "Contract document role list is out of date. Run `credo-tokens contract`.");
    }
  }
  return issues;
}
