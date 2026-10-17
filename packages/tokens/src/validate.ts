import {
  ALPHA_SOURCES,
  LITERAL_COLOR_PREFIXES,
  MODES,
  NAME_SEGMENT,
  ROLE_GROUPS,
  SETS,
  TOKEN_TYPES,
  type Mode,
} from "./constants";
import { isHexColor, rgbHex } from "./color";
import {
  TokenContext,
  areAlternatives,
  isToken,
  referencesIn,
  setNames,
  type FlatToken,
  type TokenFile,
} from "./model";

export interface Issue {
  severity: "error" | "warning";
  code: string;
  message: string;
  set?: string;
  path?: string;
}

export function formatIssue(i: Issue): string {
  const where = [i.set, i.path].filter(Boolean).join(" ");
  return `${i.severity} [${i.code}]${where ? ` ${where}:` : ""} ${i.message}`;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const SCALE_ORDERED = ["spacing", "radius", "border-width"];
const NAMED_SCALE_ORDER = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "full"];

function toPx(v: unknown): number | undefined {
  const m = /^(-?(?:\d+|\d*\.\d+))(px|rem)$/.exec(String(v));
  return m ? Number(m[1]) * (m[2] === "rem" ? 16 : 1) : undefined;
}

const REQUIRED_SETS = Object.values(SETS);

/** Validate the raw file text: JSON syntax first, then the token structure. */
export function validateText(text: string): Issue[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return [{ severity: "error", code: "invalid-json", message: `File is not valid JSON: ${(e as Error).message}` }];
  }
  return validateTokens(parsed);
}

export function validateTokens(input: unknown): Issue[] {
  const issues: Issue[] = [];
  const add = (i: Omit<Issue, "severity"> & { severity?: Issue["severity"] }) =>
    issues.push({ severity: "error", ...i });

  if (!isObject(input)) {
    return [{ severity: "error", code: "invalid-root", message: "Top level of the token file must be an object." }];
  }
  const file: TokenFile = input;
  const sets = setNames(file);

  // Sets and metadata.
  const meta = file["$metadata"];
  const order = isObject(meta) ? meta["tokenSetOrder"] : undefined;
  if (!Array.isArray(order) || order.some((s) => typeof s !== "string")) {
    add({ code: "set-order", message: "`$metadata.tokenSetOrder` must be a list of set names." });
  } else {
    for (const s of order as string[]) {
      if (!sets.includes(s)) add({ code: "set-order", set: s, message: "Listed in tokenSetOrder but missing from the file." });
    }
    for (const s of sets) {
      if (!(order as string[]).includes(s)) add({ code: "set-order", set: s, message: "Set is not listed in tokenSetOrder." });
    }
  }
  for (const s of REQUIRED_SETS) {
    if (!sets.includes(s)) add({ code: "set-missing", set: s, message: "Required token set is missing." });
  }

  // Shape of every node.
  const tokens: FlatToken[] = [];
  for (const set of sets) {
    const walk = (node: unknown, path: string[]) => {
      if (!isObject(node)) {
        add({ code: "shape", set, path: path.join("."), message: "Expected a group or a token object." });
        return;
      }
      const here = path.join(".");
      if (isToken(node)) {
        const childKeys = Object.keys(node).filter((k) => !k.startsWith("$"));
        if (childKeys.length) {
          add({ code: "shape", set, path: here, message: `Token also has child keys (${childKeys.join(", ")}). A token cannot be a group.` });
        }
        const type = node["$type"];
        if (typeof type !== "string") {
          add({ code: "missing-type", set, path: here, message: "Token has no `$type`." });
        } else if (!(TOKEN_TYPES as readonly string[]).includes(type)) {
          add({ severity: "warning", code: "unknown-type", set, path: here, message: `Unknown $type "${type}". Known: ${TOKEN_TYPES.join(", ")}.` });
        }
        const value = node["$value"];
        if (value === undefined || value === null || value === "") {
          add({ code: "shape", set, path: here, message: "Token has an empty `$value`." });
        }
        tokens.push({ path: here, set, type: typeof type === "string" ? type : undefined, value });
        return;
      }
      for (const [k, v] of Object.entries(node)) {
        if (k.startsWith("$")) continue;
        if (!NAME_SEGMENT.test(k)) {
          add({ code: "name", set, path: [...path, k].join("."), message: `Name segment "${k}" must be lowercase kebab-case (letters, digits and hyphens, no spaces).` });
        }
        walk(v, [...path, k]);
      }
    };
    walk(file[set], []);
  }

  const bySet = (s: string) => tokens.filter((t) => t.set === s);

  // Colour literals and formats.
  for (const t of tokens) {
    if (t.type !== "color") continue;
    const refs = referencesIn(t.value);
    const isLiteral = refs.length === 0;
    if (isLiteral && !isHexColor(t.value)) {
      add({ code: "color-format", set: t.set, path: t.path, message: `"${String(t.value)}" is not a hex colour.` });
    }
    if (isLiteral && t.set !== SETS.primitives && !LITERAL_COLOR_PREFIXES.some((p) => t.path.startsWith(p))) {
      add({
        code: "raw-literal",
        set: t.set,
        path: t.path,
        message: `Raw colour ${String(t.value)} is only allowed in Primitives, alpha.* and shadow.color.*. Use an alias.`,
      });
    }
  }

  // Duplicate names across sets that are stacked together.
  const seen = new Map<string, string[]>();
  for (const t of tokens) seen.set(t.path, [...(seen.get(t.path) ?? []), t.set]);
  for (const [path, owners] of seen) {
    for (let i = 0; i < owners.length; i++) {
      for (let j = i + 1; j < owners.length; j++) {
        if (!areAlternatives(owners[i]!, owners[j]!)) {
          add({ code: "duplicate", path, message: `Defined in both "${owners[i]}" and "${owners[j]}". Names must be unique across sets.` });
        }
      }
    }
  }

  // Parity between alternative sets.
  const parity = (a: string, b: string) => {
    if (!sets.includes(a) || !sets.includes(b)) return;
    const A = new Map(bySet(a).map((t) => [t.path, t]));
    const B = new Map(bySet(b).map((t) => [t.path, t]));
    for (const [p, t] of A) {
      if (!B.has(p)) add({ code: "parity", set: b, path: p, message: `Present in "${a}" but missing here.` });
      else if (B.get(p)!.type !== t.type) add({ code: "parity", set: b, path: p, message: `$type differs from "${a}" (${t.type} vs ${B.get(p)!.type}).` });
    }
    for (const p of B.keys()) {
      if (!A.has(p)) add({ code: "parity", set: a, path: p, message: `Present in "${b}" but missing here.` });
    }
  };
  parity(SETS.light, SETS.dark);
  parity(SETS.desktop, SETS.mobile);

  // Role groups of the semantic sets.
  for (const set of [SETS.light, SETS.dark]) {
    if (!sets.includes(set)) continue;
    const groups = new Set(bySet(set).map((t) => t.path.split(".")[0]!));
    for (const g of groups) {
      if (!(ROLE_GROUPS as readonly string[]).includes(g)) {
        add({ code: "role-group", set, path: g, message: `"${g}" is not a contract role group (${ROLE_GROUPS.join(", ")}).` });
      }
    }
    for (const g of ROLE_GROUPS) {
      if (!groups.has(g)) add({ code: "role-group", set, path: g, message: "Contract role group has no tokens." });
    }
  }

  // Alias resolution, cycles and type agreement, in every stacked context.
  const contexts: { name: string; ctx: TokenContext; sets: string[] }[] = [
    { name: "light", ctx: TokenContext.forMode(file, "light"), sets: [SETS.primitives, SETS.brand, SETS.light, SETS.desktop] },
    { name: "dark", ctx: TokenContext.forMode(file, "dark"), sets: [SETS.primitives, SETS.brand, SETS.dark, SETS.desktop] },
    { name: "mobile", ctx: TokenContext.forMode(file, "light", "mobile"), sets: [SETS.mobile] },
  ];
  const reported = new Set<string>();
  const once = (key: string, fn: () => void) => {
    if (!reported.has(key)) {
      reported.add(key);
      fn();
    }
  };
  for (const { name, ctx, sets: inSets } of contexts) {
    for (const t of tokens.filter((x) => inSets.includes(x.set))) {
      const refs = referencesIn(t.value);
      if (refs.length === 0) continue;
      const res = ctx.resolveValue(t.value, [t.path]);
      if (res.error === "unresolved") {
        once(`u:${t.set}:${t.path}:${res.at}`, () =>
          add({ code: "alias-unresolved", set: t.set, path: t.path, message: `Alias {${res.at}} does not resolve (checked in ${name} context).` }),
        );
      } else if (res.error === "cycle") {
        once(`c:${t.set}:${t.path}`, () =>
          add({ code: "alias-cycle", set: t.set, path: t.path, message: `Alias cycle: ${res.chain.join(" -> ")}.` }),
        );
      } else if (/^\{[^{}]+\}$/.test(String(t.value))) {
        const end = ctx.get(res.chain[res.chain.length - 1]!);
        if (end && t.type && end.type && end.type !== t.type) {
          once(`t:${t.set}:${t.path}`, () =>
            add({ code: "alias-type", set: t.set, path: t.path, message: `Is $type "${t.type}" but its alias ends at "${end.path}" which is "${end.type}".` }),
          );
        }
      }
    }
  }

  // Scale tokens (spacing, radius, border-width): dimensions in ascending order. They are not
  // themed per mode, so they are exempt from contrast and light/dark parity.
  const lightCtx = contexts.find((c) => c.name === "light")!.ctx;
  for (const group of SCALE_ORDERED) {
    const entries: { t: FlatToken; px: number; rank: number; named: boolean }[] = [];
    for (const t of bySet(SETS.primitives).filter((x) => x.path.split(".")[0] === group)) {
      if (t.type !== "dimension") {
        add({ code: "scale-type", set: t.set, path: t.path, message: `${group} tokens must be dimensions, but this one is "${t.type ?? "untyped"}".` });
        continue;
      }
      const res = lightCtx.resolveValue(t.value, [t.path]);
      const px = res.error ? undefined : toPx(res.value);
      if (px === undefined) {
        add({ code: "scale-type", set: t.set, path: t.path, message: `Value ${JSON.stringify(res.value ?? t.value)} is not a px or rem dimension.` });
        continue;
      }
      // Order by the key, not by object key order: numeric keys by number, named keys by the declared list.
      const key = t.path.slice(group.length + 1);
      const num = /^\d+(\.\d+)?$/.test(key) ? Number(key) : undefined;
      const named = NAMED_SCALE_ORDER.indexOf(key);
      if (num === undefined && named === -1) {
        add({ severity: "warning", code: "scale-name", set: t.set, path: t.path, message: `"${key}" is not a numeric key or a known size name (${NAMED_SCALE_ORDER.join(", ")}), so its order is not checked.` });
        continue;
      }
      entries.push({ t, px, rank: num ?? named, named: num === undefined });
    }
    entries.sort((x, y) => Number(x.named) - Number(y.named) || x.rank - y.rank);
    for (let i = 1; i < entries.length; i++) {
      const prev = entries[i - 1]!;
      const cur = entries[i]!;
      if (prev.named === cur.named && cur.px <= prev.px) {
        add({ code: "scale-order", set: cur.t.set, path: cur.t.path, message: `${cur.t.path} (${cur.px}px) must be larger than ${prev.t.path} (${prev.px}px). Scales are ascending.` });
      }
    }
  }

  // Alpha literals must carry the RGB of the scale step the contract names.
  for (const mode of MODES) {
    const set = mode === "light" ? SETS.light : SETS.dark;
    if (!sets.includes(set)) continue;
    const ctx = contexts.find((c) => c.name === mode)!.ctx;
    for (const t of bySet(set).filter((x) => x.path.startsWith("alpha."))) {
      const group = t.path.split(".")[1]!;
      const source = ALPHA_SOURCES[group]?.[mode as Mode];
      if (!source) {
        add({ code: "alpha-source", set, path: t.path, message: `Alpha group "${group}" has no source step in the contract.` });
        continue;
      }
      const expected = ctx.resolve(source);
      const actual = ctx.resolveValue(t.value, [t.path]);
      if (expected.error || actual.error) {
        add({ code: "alpha-source", set, path: t.path, message: `Cannot resolve ${source} or the value to check the alpha colour.` });
        continue;
      }
      const e = rgbHex(String(expected.value));
      const a = rgbHex(String(actual.value));
      if (!e || !a || e !== a) {
        add({
          code: "alpha-source",
          set,
          path: t.path,
          message: `RGB ${a ?? String(actual.value)} does not match ${source} (${e ?? String(expected.value)}).`,
        });
      }
    }
  }

  return issues;
}

export const hasErrors = (issues: Issue[]) => issues.some((i) => i.severity === "error");
