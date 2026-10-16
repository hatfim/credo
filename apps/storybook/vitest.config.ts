import { defineConfig } from "vitest/config";

// Smoke test for the built Storybook. Run through `pnpm test:storybook`.
export default defineConfig({
  test: { include: ["test/**/*.test.ts"], environment: "node" },
});
