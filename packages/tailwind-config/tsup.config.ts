import { defineConfig } from "tsup";

// decision 0004 (accepted): tsup is the library build tool.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
});
