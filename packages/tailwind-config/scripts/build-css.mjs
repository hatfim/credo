// Writes dist/theme.css after tsup has built dist/index.js.
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { buildThemeCss } from "../dist/index.js";

const require = createRequire(import.meta.url);
const table = JSON.parse(await readFile(require.resolve("@usecredo/tokens/table.json"), "utf8"));
await writeFile(new URL("../dist/theme.css", import.meta.url), buildThemeCss(table));
console.log("Wrote dist/theme.css");
