import { buildArtifacts, type TokenTable } from "./build";
import type { TokenFile } from "./model";

/** Hidden marker; the sync workflow finds and updates its own comment through it. */
export const DIFF_MARKER = "<!-- credo-token-diff -->";

/** GitHub rejects comments above 65536 characters; stay well below. */
const MAX_ROWS = 150;

export interface Change {
  /** Role or scale path, plus the mode or breakpoint when it has one. */
  name: string;
  variable: string;
  before: string | undefined;
  after: string | undefined;
}

type Flat = Map<string, { variable: string; value: string }>;

export function flattenTable(table: TokenTable): Flat {
  const out: Flat = new Map();
  for (const r of table.roles) {
    for (const mode of ["light", "dark"] as const) {
      out.set(`${r.path} (${mode})`, { variable: r.variable, value: r.value[mode] });
    }
  }
  for (const s of table.scales) out.set(s.path, { variable: s.variable, value: s.value });
  for (const t of table.typography) {
    out.set(`${t.path} (desktop)`, { variable: t.variable, value: t.desktop });
    out.set(`${t.path} (mobile)`, { variable: t.variable, value: t.mobile });
  }
  return out;
}

/** Resolved-value differences between two builds. */
export function diffTables(before: TokenTable, after: TokenTable): Change[] {
  const a = flattenTable(before);
  const b = flattenTable(after);
  const changes: Change[] = [];
  for (const [name, x] of a) {
    const y = b.get(name);
    if (!y) changes.push({ name, variable: x.variable, before: x.value, after: undefined });
    else if (y.value !== x.value) changes.push({ name, variable: x.variable, before: x.value, after: y.value });
  }
  for (const [name, y] of b) {
    if (!a.has(name)) changes.push({ name, variable: y.variable, before: undefined, after: y.value });
  }
  return changes;
}

const cell = (v: string | undefined) => (v === undefined ? "(none)" : `\`${v}\``);

export function renderComment(changes: Change[], baseLabel: string, total?: { count: number; label: string }): string {
  const lines = [DIFF_MARKER, "### Token changes (resolved values)", "", `Compared with ${baseLabel}.`, ""];
  if (total) lines.push(`Total in this pull request, compared with ${total.label}: ${total.count} resolved value${total.count === 1 ? "" : "s"} changed.`, "");
  if (changes.length === 0) {
    lines.push("No resolved value changed. The raw file differs, for example in metadata or ordering.");
    return lines.join("\n") + "\n";
  }
  lines.push(`${changes.length} resolved value${changes.length === 1 ? "" : "s"} changed.`, "");
  lines.push("| Token | Variable | Before | After |", "| --- | --- | --- | --- |");
  for (const c of changes.slice(0, MAX_ROWS)) {
    lines.push(`| ${c.name} | \`${c.variable}\` | ${cell(c.before)} | ${cell(c.after)} |`);
  }
  if (changes.length > MAX_ROWS) lines.push("", `${changes.length - MAX_ROWS} more changes not shown. See the file diff.`);
  return lines.join("\n") + "\n";
}

async function tableOf(text: string): Promise<TokenTable> {
  return JSON.parse((await buildArtifacts(JSON.parse(text) as TokenFile)).table) as TokenTable;
}

export interface BaseCandidate {
  label: string;
  /** Returns the token file text at that revision, or undefined when it does not exist. */
  read: () => Promise<string | undefined> | string | undefined;
}

/**
 * Builds the comment against the first candidate that yields a readable, buildable token file.
 * Candidates are the previous commit first, then `main`. Returns a notice if none works.
 */
export async function compareWithFirstAvailable(
  afterText: string,
  candidates: BaseCandidate[],
  totalBase?: BaseCandidate,
): Promise<string> {
  const after = await tableOf(afterText);
  let total: { count: number; label: string } | undefined;
  if (totalBase) {
    try {
      const text = await totalBase.read();
      if (text !== undefined) total = { count: diffTables(await tableOf(text), after).length, label: totalBase.label };
    } catch {
      total = undefined;
    }
  }
  for (const c of candidates) {
    const text = await c.read();
    if (text === undefined) continue;
    try {
      return renderComment(diffTables(await tableOf(text), after), c.label, total);
    } catch {
      continue;
    }
  }
  return [DIFF_MARKER, "### Token changes (resolved values)", "", "No earlier version of the token file could be read, so no comparison is shown.", ""].join("\n");
}
