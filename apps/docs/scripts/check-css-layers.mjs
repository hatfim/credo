// Style isolation check on the built site (DOC-04). Run after `docusaurus build`; the docs
// `build` script runs it. Fails when:
//  (a) a rule that belongs to Infima, the docs framework's base stylesheet, sits outside a cascade
//      layer in the built CSS (unlayered rules beat every layered rule, so it would leak into the
//      live component examples), or `@layer infima` is missing the rules it must contain;
//  (b) the effective layer order is not infima, theme, base, components, utilities (infima lowest).
// The minifier is the usual culprit: it can hoist rules out of a layer or drop the order statement.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import postcss from "postcss";

const build = path.resolve(import.meta.dirname, "../build");
if (!existsSync(build)) {
  console.error("build/ not found. Run `pnpm --filter @usecredo/docs build` first.");
  process.exit(1);
}
const EXPECTED = ["infima", "theme", "base", "components", "utilities"];
// Selectors that only Infima defines as bare rules. Exact match on a selector of the list.
const INFIMA_SELECTORS = new Set([
  ".navbar", ".container", ".col", ".row", ".hero", ".footer", ".menu", ".button", ".card", ".alert",
  ".badge", ".pagination", ".tabs", ".table-of-contents", "a", "p", "h1", "h2", "h3",
  "table", "code", "pre", "blockquote", "hr", "ul", "ol", "img", "kbd",
]);

const cssDir = path.join(build, "assets/css");
const files = readdirSync(cssDir).filter((f) => f.endsWith(".css"));
if (files.length === 0) {
  console.error("No CSS found in build/assets/css.");
  process.exit(1);
}

const problems = [];
const layerSeen = []; // first appearance order, across files in link order below

function noteLayer(name) {
  if (name !== "properties" && !layerSeen.includes(name)) layerSeen.push(name);
}
function noteLayerParams(params) {
  for (const name of params.split(",").map((s) => s.trim()).filter(Boolean)) noteLayer(name);
}

/** Head order: inline <style> statements first, then stylesheet links, as the browser sees them. */
const html = readFileSync(path.join(build, "index.html"), "utf8");
const inline = [...html.matchAll(/<style>([^<]*)<\/style>/g)].map((m) => m[1]);
const linked = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
const sheets = linked
  .map((href) => path.join(build, href.replace(/^\/+/, "")))
  .filter((p) => existsSync(p));
if (sheets.length === 0) problems.push("index.html links no stylesheet that exists in build/");

const orderStatementInHead = inline.some((css) => {
  const root = postcss.parse(css);
  let ok = false;
  root.walkAtRules("layer", (r) => {
    if (!r.nodes && r.params.replace(/\s/g, "") === EXPECTED.join(",")) ok = true;
  });
  return ok;
});
if (!orderStatementInHead) problems.push(`index.html <head> lacks an inline "@layer ${EXPECTED.join(", ")};" before the stylesheets`);
for (const css of inline) postcss.parse(css).walkAtRules("layer", (r) => noteLayerParams(r.params));

const layerContents = new Map(); // layer name -> set of selectors inside it
for (const sheet of sheets) {
  const root = postcss.parse(readFileSync(sheet, "utf8"));
  const sheetName = path.relative(build, sheet);
  const checkRule = (rule) => {
    for (const sel of rule.selectors ?? []) {
      if (INFIMA_SELECTORS.has(sel.trim()))
        problems.push(`${sheetName}: unlayered rule with Infima selector "${sel.trim()}" (line ${rule.source?.start?.line})`);
    }
    if (rule.selectors?.some((s) => s.trim() === ":root"))
      rule.walkDecls(/^--ifm-/, (d) => {
        problems.push(`${sheetName}: unlayered :root declares ${d.prop} (line ${d.source?.start?.line})`);
      });
  };
  root.each((node) => {
    if (node.type === "atrule" && node.name === "layer") {
      noteLayerParams(node.params);
      if (node.nodes) {
        const set = layerContents.get(node.params.trim()) ?? new Set();
        node.walkRules((r) => r.selectors.forEach((s) => set.add(s.trim())));
        layerContents.set(node.params.trim(), set);
      }
    } else if (node.type === "rule") {
      checkRule(node);
    } else if (node.type === "atrule" && ["media", "supports", "container"].includes(node.name)) {
      node.walkRules((r) => {
        if (!r.parent || r.parent === node || r.parent.type !== "rule") checkRule(r);
      });
    }
  });
}

const infimaSet = layerContents.get("infima") ?? new Set();
for (const must of [".navbar", ".container", ".col", ".hero", ".footer"]) {
  if (!infimaSet.has(must)) problems.push(`@layer infima does not contain a rule for "${must}"`);
}
if (![...infimaSet].some((s) => s === ":root" || s.startsWith(":root")))
  problems.push("@layer infima does not contain the :root variable rules");

const effective = layerSeen.filter((n) => EXPECTED.includes(n));
if (effective.join(",") !== EXPECTED.join(","))
  problems.push(`layer order is "${effective.join(", ")}", expected "${EXPECTED.join(", ")}"`);

if (problems.length) {
  console.error("check:css-layers failed:");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`check:css-layers ok: ${sheets.length} stylesheet(s), ${infimaSet.size} selectors in @layer infima, order ${effective.join(" < ")}`);
