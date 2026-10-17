import { createConfig } from "@usecredo/eslint-config";

export default [
  ...createConfig(import.meta.dirname),
  {
    // css-minimizer serialises lightningMinify into a worker, so it cannot use top-level imports
    // and must `require` lightningcss inside the function. This is the only file allowed to.
    files: ["plugins/infima-layer.ts"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
];
