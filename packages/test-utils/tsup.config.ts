import { defineConfig } from "tsup";

// TODO(decision: build-tool): tsup is the conservative default until the decision record is accepted.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
});
