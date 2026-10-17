#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildArtifacts } from "./build";
import { checkConsistency } from "./consistency";
import { updateContractDoc } from "./contract";
import type { TokenFile } from "./model";
import { checkTheme, formatResult, type BaselineEntry } from "./theme";
import { formatIssue, hasErrors, validateText, type Issue } from "./validate";

const USAGE = `Usage: credo-tokens <command> [options]

Commands
  validate   Check the raw token file (JSON, shape, aliases, literals, alpha sources)
  build      Write tokens.css, token-names.d.ts, tokens.schema.json and tokens-table.json
  contrast   Check completeness, value types and WCAG 2.2 AA contrast
  contract   Rewrite the generated role list in docs/token-contract-v0.md (--check to verify)

Options
  --file <path>      Token file (default generated/tokens.json)
  --out <dir>        Output folder for build (default dist)
  --baseline <path>  Contrast exceptions (default contrast-baseline.json, if present)
  --doc <path>       Contract document (default ../../docs/token-contract-v0.md)
  --check            contract: fail instead of writing
`;

function parseArgs(argv: string[]) {
  const [command, ...rest] = argv;
  const opts: Record<string, string | true> = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;
    if (!a.startsWith("--")) continue;
    const next = rest[i + 1];
    if (next === undefined || next.startsWith("--")) opts[a.slice(2)] = true;
    else {
      opts[a.slice(2)] = next;
      i++;
    }
  }
  return { command, opts };
}

function report(issues: Issue[]) {
  for (const i of issues) console.error(formatIssue(i));
}

async function main(): Promise<number> {
  const { command, opts } = parseArgs(process.argv.slice(2));
  const fileArg = typeof opts["file"] === "string" ? opts["file"] : "generated/tokens.json";
  const filePath = path.resolve(fileArg);
  if (!command || command === "help" || opts["help"]) {
    console.log(USAGE);
    return command ? 0 : 1;
  }
  let text: string;
  try {
    text = await readFile(filePath, "utf8");
  } catch {
    console.error(`error: cannot read ${filePath}. The token file is pushed from Figma by Tokens Studio.`);
    return 1;
  }

  const issues = validateText(text);
  if (command === "validate") {
    report(issues);
    console.log(hasErrors(issues) ? "Token file is invalid." : `Token file is valid (${issues.length} warnings).`);
    return hasErrors(issues) ? 1 : 0;
  }
  if (hasErrors(issues)) {
    report(issues);
    console.error("Token file is invalid. Run `credo-tokens validate`.");
    return 1;
  }
  const file = JSON.parse(text) as TokenFile;

  if (command === "build") {
    const out = path.resolve(typeof opts["out"] === "string" ? opts["out"] : "dist");
    const art = await buildArtifacts(file);
    const docPath = typeof opts["doc"] === "string" ? opts["doc"] : path.resolve("../../docs/token-contract-v0.md");
    const doc = await readFile(docPath, "utf8").catch(() => undefined);
    const diverged = checkConsistency(art, file, doc);
    if (diverged.length) {
      report(diverged);
      return 1;
    }
    await mkdir(out, { recursive: true });
    await Promise.all([
      writeFile(path.join(out, "tokens.css"), art.css),
      writeFile(path.join(out, "token-names.d.ts"), art.types),
      writeFile(path.join(out, "tokens.schema.json"), art.schema),
      writeFile(path.join(out, "tokens-table.json"), art.table),
    ]);
    console.log(`Wrote tokens.css, token-names.d.ts, tokens.schema.json and tokens-table.json to ${out}`);
    return 0;
  }

  if (command === "contrast") {
    const baselinePath = path.resolve(typeof opts["baseline"] === "string" ? opts["baseline"] : "contrast-baseline.json");
    const baselineText = await readFile(baselinePath, "utf8").catch(() => undefined);
    const baseline: BaselineEntry[] = baselineText ? (JSON.parse(baselineText) as { exceptions: BaselineEntry[] }).exceptions : [];
    const r = checkTheme(file, baseline);
    report(r.issues);
    for (const f of r.failures) console.error(`error [contrast] ${formatResult(f)}`);
    console.log(
      `Contrast: ${r.results.length} checks (${r.checks.light} light, ${r.checks.dark} dark), ` +
        `${r.failures.length} failing, ${baseline.length} baseline exceptions.`,
    );
    return r.failures.length || hasErrors(r.issues) ? 1 : 0;
  }

  if (command === "contract") {
    const docPath = path.resolve(typeof opts["doc"] === "string" ? opts["doc"] : "../../docs/token-contract-v0.md");
    const doc = await readFile(docPath, "utf8");
    const next = updateContractDoc(doc, file);
    if (opts["check"]) {
      if (next !== doc) {
        console.error("error: the role list in the contract document is out of date. Run `credo-tokens contract`.");
        return 1;
      }
      console.log("Contract role list is up to date.");
      return 0;
    }
    await writeFile(docPath, next);
    console.log(`Updated ${docPath}`);
    return 0;
  }

  console.error(`Unknown command "${command}".\n\n${USAGE}`);
  return 1;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  },
);
