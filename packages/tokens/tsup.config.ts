import { defineConfig } from "tsup";

// TODO(decision: build-tool): tsup is the conservative default until the decision record is accepted.
export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: ["esm"],
  dts: { entry: ["src/index.ts"] },
  clean: true,
  sourcemap: true,
});
