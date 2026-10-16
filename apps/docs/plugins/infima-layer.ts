// Puts the classic theme's base styles (Infima) into the cascade layer `infima`.
// src/css/custom.css orders that layer below every design system layer. Without this,
// Infima's unlayered element rules (a, p, h1, table, code, ...) would beat layered
// Tailwind v4 output and leak into live component examples.
import path from "node:path";

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
    configureWebpack() {
      const classic = require.resolve("@docusaurus/theme-classic/package.json");
      const infima = require.resolve("infima/dist/css/default/default.css", { paths: [classic] });
      return {
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
