import { ALTERNATIVE_SETS, SETS, setsForMode, type Mode } from "./constants";

export interface FlatToken {
  /** Dotted path inside its set, for example `surface.page`. */
  path: string;
  set: string;
  type: string | undefined;
  value: unknown;
}

export type TokenFile = Record<string, unknown>;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export function isToken(node: unknown): node is Record<string, unknown> {
  return isObject(node) && "$value" in node;
}

/** Names of the token sets in the file (top-level keys that are not `$`-prefixed). */
export function setNames(file: TokenFile): string[] {
  return Object.keys(file).filter((k) => !k.startsWith("$"));
}

export function flattenSet(set: string, node: unknown): FlatToken[] {
  const out: FlatToken[] = [];
  const walk = (n: unknown, path: string[]) => {
    if (!isObject(n)) return;
    if (isToken(n)) {
      out.push({
        path: path.join("."),
        set,
        type: typeof n["$type"] === "string" ? n["$type"] : undefined,
        value: n["$value"],
      });
      return;
    }
    for (const [k, v] of Object.entries(n)) if (!k.startsWith("$")) walk(v, [...path, k]);
  };
  walk(node, []);
  return out;
}

export function flattenFile(file: TokenFile): FlatToken[] {
  return setNames(file).flatMap((s) => flattenSet(s, file[s]));
}

export function areAlternatives(a: string, b: string): boolean {
  return ALTERNATIVE_SETS.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

const REF = /\{([^{}]+)\}/g;

/** Alias paths referenced inside a value (strings, arrays, objects). */
export function referencesIn(value: unknown): string[] {
  if (typeof value === "string") return [...value.matchAll(REF)].map((m) => m[1]!);
  if (Array.isArray(value)) return value.flatMap(referencesIn);
  if (isObject(value)) return Object.values(value).flatMap(referencesIn);
  return [];
}

export interface ResolveResult {
  value: unknown;
  /** Set when resolution failed. */
  error?: "unresolved" | "cycle";
  /** The alias path that caused the error. */
  at?: string;
  chain: string[];
}

/** Token lookup for a stack of sets (later sets override earlier ones). */
export class TokenContext {
  private readonly map = new Map<string, FlatToken>();

  constructor(tokens: FlatToken[]) {
    for (const t of tokens) this.map.set(t.path, t);
  }

  static forSets(file: TokenFile, sets: string[]): TokenContext {
    return new TokenContext(sets.flatMap((s) => (s in file ? flattenSet(s, file[s]) : [])));
  }

  static forMode(file: TokenFile, mode: Mode, typography: "desktop" | "mobile" = "desktop"): TokenContext {
    const sets = setsForMode(mode).map((s) => (s === SETS.desktop && typography === "mobile" ? SETS.mobile : s));
    return TokenContext.forSets(file, sets);
  }

  get(path: string): FlatToken | undefined {
    return this.map.get(path);
  }

  paths(): string[] {
    return [...this.map.keys()];
  }

  resolve(path: string, seen: string[] = []): ResolveResult {
    const tok = this.map.get(path);
    if (!tok) return { value: undefined, error: "unresolved", at: path, chain: seen };
    if (seen.includes(path)) return { value: undefined, error: "cycle", at: path, chain: [...seen, path] };
    return this.resolveValue(tok.value, [...seen, path]);
  }

  resolveValue(value: unknown, seen: string[] = []): ResolveResult {
    if (typeof value !== "string") return { value, chain: seen };
    const whole = /^\{([^{}]+)\}$/.exec(value);
    if (whole) return this.resolve(whole[1]!, seen);
    const refs = referencesIn(value);
    if (refs.length === 0) return { value, chain: seen };
    let result = value;
    for (const r of refs) {
      const res = this.resolve(r, seen);
      if (res.error) return res;
      result = result.replace(`{${r}}`, String(res.value));
    }
    return { value: result, chain: seen };
  }
}

/** Paths of the semantic roles: the tokens of the light set. */
export function rolePaths(file: TokenFile): string[] {
  return flattenSet(SETS.light, file[SETS.light]).map((t) => t.path);
}
