import { defineConfig } from "tsup";

// decision 0004: tsup is the library build tool.
export default defineConfig({
  entry: ["src/index.ts", "src/a11y.ts", "src/setup.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
});
