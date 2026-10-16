import { defineConfig } from "tsup";

// TODO(decision: build-tool): tsup is the conservative default until the decision record is accepted.
// One entry per component (subpath export). esbuild drops module directives when bundling, so
// the banner re-adds "use client"; every component entry is a client component for now.
// TODO(decision: use-client-scope): split the banner per entry once a server-only component exists.
export default defineConfig({
  entry: { index: "src/index.ts", button: "src/button/index.ts" },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  banner: { js: '"use client";' },
  external: ["react", "react-dom"],
});
