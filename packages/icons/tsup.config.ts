import path from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { defineConfig } from "tsup";

// decision 0004: tsup is the library build tool.
// The client entry re-exports Phosphor's client icons, which use React context, so it must
// carry "use client" for React Server Components. The ./server entry must not carry it.
export default defineConfig((options) => ({
  entry: ["src/index.ts", "src/server.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  async onSuccess() {
    const file = path.join(options.outDir ?? "dist", "index.js");
    const code = readFileSync(file, "utf8");
    if (!code.startsWith('"use client"')) writeFileSync(file, `"use client";\n${code}`);
  },
}));
