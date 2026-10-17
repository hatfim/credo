// @vitest-environment jsdom
// Smoke test for the built Storybook: renders every story with Storybook's portable stories
// (the same story files and the same preview decorators), runs each `play` function, and runs
// axe on the result. Needs `storybook build` first (turbo `test:storybook` depends on `build`).
import { composeStories, setProjectAnnotations } from "@storybook/react-vite";
import { expectNoA11yViolations } from "@usecredo/test-utils/a11y";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import preview from "../.storybook/preview";

setProjectAnnotations([preview]);

// Storybook only injects its instrumented `userEvent` into the play context when the browser has a
// clipboard (jsdom has none). An empty stand-in is enough: no story here reads the clipboard.
if (!navigator.clipboard) Object.defineProperty(navigator, "clipboard", { value: {}, configurable: true });

const indexPath = path.resolve(import.meta.dirname, "../storybook-static/index.json");
if (!existsSync(indexPath)) {
  throw new Error("storybook-static/index.json not found. Run `pnpm --filter @usecredo/storybook build` first.");
}
const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
  entries: Record<string, { id: string; type: "story" | "docs" }>;
};
const indexedStories = Object.values(index.entries)
  .filter((e) => e.type === "story")
  .map((e) => e.id);

// The same files Storybook builds (see .storybook/main.ts).
const modules = import.meta.glob("../../../packages/ui/src/**/*.stories.tsx", { eager: true });
type Composed = { id: string; run: () => Promise<void> };
const composed: Composed[] = Object.values(modules).flatMap(
  (mod) => Object.values(composeStories(mod as Parameters<typeof composeStories>[0])) as Composed[],
);

describe("story set", () => {
  it("is not empty and contains the Button stories", () => {
    expect(indexedStories.length).toBeGreaterThan(0);
    expect(indexedStories).toEqual(
      expect.arrayContaining(["components-button--default", "components-button--keyboard"]),
    );
  });

  it("matches what the portable stories render", () => {
    expect(composed.map((s) => s.id).sort()).toEqual([...indexedStories].sort());
  });
});

describe("every story renders, passes its play function and has no axe violations", () => {
  for (const Story of composed) {
    it(Story.id, async () => {
      await Story.run();
      // jsdom has no layout (colour contrast runs in the browser addon). The page-level `region`
      // rule does not apply to a story fragment.
      await expectNoA11yViolations(document.body, {
        axe: { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } },
      });
    });
  }
});
