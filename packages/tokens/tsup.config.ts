import { defineConfig } from "tsup";

// decision 0004 (accepted): tsup is the library build tool.
export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: ["esm"],
  dts: { entry: ["src/index.ts"] },
  clean: true,
  sourcemap: true,
});
