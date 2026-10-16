import path from "node:path";
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import noComponentDefinitions from "./rules/no-component-definitions.js";

const SOURCE = ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"];

const DEEP = {
  group: ["@usecredo/*/src", "@usecredo/*/src/**", "@usecredo/*/dist", "@usecredo/*/dist/**"],
  message: "Deep imports are not public API. Use a documented export (DST-02).",
};
const NO_REPO_PATHS = {
  group: ["**/apps/**", "**/packages/**", "**/consumers/**"],
  message: "Import through the package name, never through repository paths.",
};
const forbid = (names, why) => ({
  group: names.flatMap((n) => [n, `${n}/*`]),
  message: `${why} Dependencies run one way (PRD 5.1).`,
});

const APPS = ["@usecredo/docs", "@usecredo/storybook"];
const CONSUMERS = ["@usecredo/consumer-vite-app", "@usecredo/consumer-next-app"];
const BOTTOM_UP = {
  tokens: ["ui", "tailwind-config", "icons", "test-utils"],
  "tailwind-config": ["ui", "icons", "test-utils"],
  ui: ["tailwind-config", "test-utils"],
  icons: ["tokens", "tailwind-config", "ui", "test-utils"],
  "test-utils": ["tailwind-config"],
};

/** Import-boundary restrictions for the workspace that owns `dirname`. */
function boundaryPatterns(kind, name) {
  const patterns = [DEEP, NO_REPO_PATHS];
  if (kind === "packages") {
    patterns.push(
      forbid([...APPS, ...CONSUMERS], "Packages never import from apps or consumers."),
    );
    const blocked = (BOTTOM_UP[name] ?? []).map((n) => `@usecredo/${n}`);
    if (blocked.length) patterns.push(forbid(blocked, `'${name}' must not import these.`));
  } else if (kind === "apps") {
    patterns.push(
      forbid(
        [...CONSUMERS, ...APPS.filter((a) => a !== `@usecredo/${name}`)],
        "Apps do not import consumers or each other.",
      ),
    );
  } else if (kind === "consumers") {
    patterns.push(
      forbid(
        [...APPS, ...CONSUMERS, "@usecredo/test-utils"],
        "Consumers use only the packed public packages.",
      ),
    );
  }
  return patterns;
}

/**
 * Shared flat config. Pass `import.meta.dirname` from the workspace's eslint.config.js
 * so the boundary rules know which workspace they apply to.
 */
export function createConfig(dirname) {
  const parts = path.resolve(dirname).split(path.sep);
  const i = parts.findLastIndex((p) => ["apps", "packages", "consumers"].includes(p));
  const kind = parts[i];
  const name = parts[i + 1];

  return tseslint.config(
    {
      ignores: [
        "**/dist/**",
        "**/build/**",
        "**/.next/**",
        "**/.docusaurus/**",
        "**/storybook-static/**",
        "**/coverage/**",
        "**/generated/**",
      ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
      languageOptions: {
        globals: { ...globals.browser, ...globals.node },
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
    },
    {
      files: SOURCE,
      rules: {
        "no-restricted-imports": ["error", { patterns: boundaryPatterns(kind, name) }],
      },
    },
    kind === "apps"
      ? {
          files: SOURCE,
          plugins: { credo: { rules: { "no-component-definitions": noComponentDefinitions } } },
          rules: { "credo/no-component-definitions": "error" },
        }
      : {},
  );
}
