// Writes dist/theme.css and the provisional dist/precompiled.css after tsup has built dist/index.js.
// TODO(decision: precompiled-stylesheet): spike A has not decided whether the precompiled stylesheet stays.
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { compile } from "tailwindcss";
import { buildThemeCss, precompiledCandidates } from "../dist/index.js";

const require = createRequire(import.meta.url);
const table = JSON.parse(await readFile(require.resolve("@usecredo/tokens/table.json"), "utf8"));
const tokensCss = await readFile(require.resolve("@usecredo/tokens/tokens.css"), "utf8");

const theme = buildThemeCss(table);
await writeFile(new URL("../dist/theme.css", import.meta.url), theme);

const compiler = await compile(`${theme}\n@tailwind utilities;\n`);
const utilities = compiler.build(precompiledCandidates(table));
const header = "/* Provisional precompiled stylesheet: token variables plus role utilities. Do not edit. */\n";
await writeFile(new URL("../dist/precompiled.css", import.meta.url), `${header}${tokensCss}\n${utilities}`);
console.log("Wrote dist/theme.css and dist/precompiled.css");
