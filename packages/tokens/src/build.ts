import {
  CSS_PREFIX,
  MOBILE_MEDIA_QUERY,
  ROLE_GROUPS,
  SCALE_EXPORTS,
  SETS,
  type Mode,
} from "./constants";
import { cssVariable } from "./naming";
import { TokenContext, flattenSet, rolePaths, type FlatToken, type TokenFile } from "./model";

export interface TokenRow {
  /** Dotted token path, for example `surface.page`. */
  path: string;
  /** CSS custom property, for example `--cr-surface-page`. */
  variable: string;
  type: string;
  /** Resolved CSS value. */
  value: string;
}

export interface RoleRow {
  path: string;
  group: string;
  variable: string;
  type: string;
  /** The alias or literal written in the token file. */
  source: Record<Mode, string>;
  /** Resolved CSS value. */
  value: Record<Mode, string>;
}

/** The one machine-readable description of the output. The docs app reads this. */
export interface TokenTable {
  prefix: string;
  roles: RoleRow[];
  /** Radius, spacing, border width and font family scales. */
  scales: TokenRow[];
  /** Typography styles; `mobile` replaces `desktop` under the mobile media query. */
  typography: { path: string; variable: string; type: string; desktop: string; mobile: string }[];
}

export interface Artifacts {
  css: string;
  /** Type declarations, as the text of `token-names.d.ts`. */
  types: string;
  /** JSON schema for a semantic token set, as text. */
  schema: string;
  /** JSON text of the TokenTable. */
  table: string;
}

type Plain = Record<string, unknown>;

function toTree(tokens: FlatToken[], file: TokenFile): Plain {
  const out: Plain = {};
  for (const t of tokens) {
    const raw = findNode(file[t.set], t.path);
    let node = out;
    const parts = t.path.split(".");
    parts.slice(0, -1).forEach((p) => {
      node = (node[p] ??= {}) as Plain;
    });
    node[parts[parts.length - 1]!] = raw;
  }
  return out;
}

function findNode(root: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((n, k) => (n as Plain)[k], root);
}

interface SdToken {
  path: string[];
  name: string;
  type: string;
  value: string;
  original: string;
}

let registered = false;

async function runStyleDictionary(
  tree: Plain,
  keep: (path: string) => boolean,
  selector: string,
): Promise<{ css: string; tokens: SdToken[] }> {
  const { default: StyleDictionary } = await import("style-dictionary");
  if (!registered) {
    const { register } = await import("@tokens-studio/sd-transforms");
    register(StyleDictionary);
    StyleDictionary.registerTransform({
      name: "name/credo",
      type: "name",
      transform: (token) => [CSS_PREFIX, ...token.path].join("-"),
    });
    registered = true;
  }
  const sd = new StyleDictionary({
    tokens: tree as never,
    log: { verbosity: "silent", warnings: "disabled" },
    platforms: {
      css: {
        transformGroup: "tokens-studio",
        transforms: ["name/credo"],
        files: [
          {
            destination: "tokens.css",
            format: "css/variables",
            filter: (token) => keep(token.path.join(".")),
            options: { selector, outputReferences: false, showFileHeader: false, formatting: { commentStyle: "none" } },
          },
        ],
      },
    },
  });
  const [file] = await sd.formatPlatform("css");
  const platform = await sd.getPlatformTokens("css");
  const tokens: SdToken[] = platform.allTokens
    .filter((t) => keep(t.path.join(".")))
    .map((t) => ({
      path: t.path,
      name: t.name,
      type: String(t.$type ?? t.type),
      value: String(t.$value ?? t.value),
      original: String((t.original as Plain)["$value"] ?? ""),
    }));
  return { css: String(file?.output ?? ""), tokens };
}

const indent = (s: string) =>
  s
    .split("\n")
    .map((l) => (l ? `  ${l}` : l))
    .join("\n");

/** Build every artifact from the token file in memory. Nothing is written here. */
export async function buildArtifacts(file: TokenFile): Promise<Artifacts> {
  const roles = rolePaths(file);
  const isRole = (p: string) => (ROLE_GROUPS as readonly string[]).includes(p.split(".")[0]!);
  const isScale = (p: string) => (SCALE_EXPORTS as readonly string[]).includes(p.split(".")[0]!);

  const modeRun = async (mode: Mode) => {
    const ctx = TokenContext.forMode(file, mode);
    const flat = ctx.paths().map((p) => ctx.get(p)!);
    const selector = mode === "light" ? ':root, [data-theme="light"]' : '[data-theme="dark"]';
    return runStyleDictionary(toTree(flat, file), isRole, selector);
  };
  const light = await modeRun("light");
  const dark = await modeRun("dark");

  const primitiveTokens = flattenSet(SETS.primitives, file[SETS.primitives]);
  const desktopSet = flattenSet(SETS.desktop, file[SETS.desktop]);
  const mobileSet = flattenSet(SETS.mobile, file[SETS.mobile]);
  const typoPaths = new Set(desktopSet.map((t) => t.path));

  const staticsTree = toTree([...primitiveTokens], file);
  const statics = await runStyleDictionary(staticsTree, isScale, ":root");

  const typoTree = (set: FlatToken[]) => toTree([...primitiveTokens, ...set], file);
  const typoDesktop = await runStyleDictionary(typoTree(desktopSet), (p) => typoPaths.has(p), ":root");
  const typoMobile = await runStyleDictionary(typoTree(mobileSet), (p) => typoPaths.has(p), ":root");

  const withScheme = (css: string, scheme: Mode) => css.replace("{\n", `{\n  color-scheme: ${scheme};\n`);
  const css =
    [
      "/* Generated by @usecredo/tokens from generated/tokens.json. Do not edit. */",
      withScheme(light.css.trim(), "light"),
      withScheme(dark.css.trim(), "dark"),
      statics.css.trim(),
      typoDesktop.css.trim(),
      `@media ${MOBILE_MEDIA_QUERY} {\n${indent(typoMobile.css.trim())}\n}`,
    ]
      .filter(Boolean)
      .join("\n\n") + "\n";

  const byPath = (ts: SdToken[]) => new Map(ts.map((t) => [t.path.join("."), t]));
  const L = byPath(light.tokens);
  const D = byPath(dark.tokens);
  const table: TokenTable = {
    prefix: `--${CSS_PREFIX}-`,
    roles: roles.map((path) => {
      const l = L.get(path)!;
      const d = D.get(path)!;
      return {
        path,
        group: path.split(".")[0]!,
        variable: cssVariable(path),
        type: l.type,
        source: { light: l.original, dark: d.original },
        value: { light: l.value, dark: d.value },
      };
    }),
    scales: statics.tokens.map((t) => ({
      path: t.path.join("."),
      variable: `--${t.name}`,
      type: t.type,
      value: t.value,
    })),
    typography: typoDesktop.tokens.map((t) => {
      const m = typoMobile.tokens.find((x) => x.name === t.name);
      return { path: t.path.join("."), variable: `--${t.name}`, type: t.type, desktop: t.value, mobile: m?.value ?? "" };
    }),
  };

  return {
    css,
    types: renderTypes(table),
    schema: renderSchema(table),
    table: JSON.stringify(table, null, 2) + "\n",
  };
}

const union = (xs: string[]) => (xs.length ? xs.map((x) => `  | ${JSON.stringify(x)}`).join("\n") : "  never");
const pascal = (s: string) => s.replace(/(^|-)(\w)/g, (_, __, c: string) => c.toUpperCase());

function renderTypes(table: TokenTable): string {
  const parts = [
    "// Generated by @usecredo/tokens from generated/tokens.json. Do not edit.",
    `export type RoleName =\n${union(table.roles.map((r) => r.path))};`,
    `export type CssVariable =\n${union(table.roles.map((r) => r.variable))};`,
  ];
  for (const g of ROLE_GROUPS) {
    parts.push(`export type ${pascal(g)}Role =\n${union(table.roles.filter((r) => r.group === g).map((r) => r.path))};`);
  }
  parts.push(`export type ScaleVariable =\n${union(table.scales.map((s) => s.variable))};`);
  return parts.join("\n\n") + "\n";
}

function renderSchema(table: TokenTable): string {
  const leaf = (type: string) => ({
    type: "object",
    required: ["$type", "$value"],
    properties: { $type: { const: type }, $value: { type: "string", minLength: 1 } },
  });
  const root = { type: "object", required: [] as string[], properties: {} as Plain, additionalProperties: false };
  for (const r of table.roles) {
    let node = root as { required: string[]; properties: Plain };
    const parts = r.path.split(".");
    parts.forEach((p, i) => {
      if (!node.required.includes(p)) node.required.push(p);
      if (i === parts.length - 1) node.properties[p] = leaf(r.type);
      else {
        node = (node.properties[p] ??= { type: "object", required: [], properties: {}, additionalProperties: false }) as typeof node;
      }
    });
  }
  return (
    JSON.stringify(
      {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "Credo semantic token set",
        description: "One semantic set (light, dark or another theme). Generated from generated/tokens.json.",
        ...root,
      },
      null,
      2,
    ) + "\n"
  );
}
