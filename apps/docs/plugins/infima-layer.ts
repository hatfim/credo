// Puts the classic theme's base styles (Infima) into the cascade layer `infima`.
// src/css/custom.css orders that layer below every design system layer. Without this,
// Infima's unlayered element rules (a, p, h1, table, code, ...) would beat layered
// Tailwind v4 output and leak into live component examples.
import path from "node:path";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";

/** Layer order, lowest first. Also asserted on the built CSS by scripts/check-css-layers.mjs. */
export const LAYER_ORDER = ["infima", "theme", "base", "components", "utilities"] as const;

/**
 * Docusaurus's default CSS minimizer (cssnano plus clean-css level 2) merges and reorders rules
 * across cascade layers: it empties `@layer infima` and moves Infima rules out of it. Lightning
 * CSS minifies layer-aware and keeps blocks and the order intact.
 */
async function lightningMinify(data: Record<string, string>) {
  // Self-contained on purpose: css-minimizer serializes this function into a worker.
  // Targets are Tailwind v4's supported browsers: Safari 16.4, Chrome 111, Firefox 128.
  const { transform } = require("lightningcss") as typeof import("lightningcss");
  const targets = { safari: (16 << 16) | (4 << 8), chrome: 111 << 16, firefox: 128 << 16 };
  const [[filename, code]] = Object.entries(data) as [[string, string]];
  const result = transform({ filename, code: Buffer.from(code), minify: true, targets });
  return { code: result.code.toString(), warnings: [], errors: [] };
}

export default function infimaLayer() {
  return {
    name: "credo-infima-layer",
    // Docusaurus runs postcss-preset-env, whose cascade-layers polyfill flattens @layer into
    // specificity hacks. Native layers are supported by every browser Tailwind v4 supports.
    configurePostCss(options: { plugins: unknown[] }) {
      for (const entry of options.plugins) {
        if (Array.isArray(entry) && String(entry[0]).includes("postcss-preset-env")) {
          entry[1] = { ...entry[1], features: { ...entry[1]?.features, "cascade-layers": false } };
        }
      }
      return options;
    },
    // An explicit order statement in <head>, before any stylesheet. Independent of how the
    // bundler concatenates and minifies CSS files.
    injectHtmlTags() {
      return { headTags: [{ tagName: "style", innerHTML: `@layer ${LAYER_ORDER.join(", ")};` }] };
    },
    configureWebpack(config: { optimization?: { minimizer?: unknown[] } }, isServer: boolean) {
      const minimizer = config.optimization?.minimizer;
      const swapMinimizer =
        !isServer && minimizer
          ? {
              mergeStrategy: { "optimization.minimizer": "replace" },
              optimization: {
                minimizer: minimizer.map((m) =>
                  (m as { constructor: { name: string } }).constructor.name === "CssMinimizerPlugin" ? new CssMinimizerPlugin({ minify: lightningMinify }) : m,
                ),
              },
            }
          : {};
      const classic = require.resolve("@docusaurus/theme-classic/package.json");
      const infima = require.resolve("infima/dist/css/default/default.css", { paths: [classic] });
      return {
        ...swapMinimizer,
        module: {
          rules: [
            {
              test: (file: string) => file === infima || file === infima.replace("default.css", "default-rtl.css"),
              enforce: "pre",
              use: path.resolve(__dirname, "layer-loader.mjs"),
            },
          ],
        },
      };
    },
  };
}
