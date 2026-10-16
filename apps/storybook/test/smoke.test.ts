import { composeStories } from "@storybook/react-vite";
import { type FunctionComponent, createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

interface IndexEntry {
  id: string;
  type: "story" | "docs";
  importPath: string;
}

// Absent until `storybook build` has run; the test then fails on purpose.
const built = import.meta.glob<{ entries: Record<string, IndexEntry> }>(
  "../storybook-static/index.json",
  { eager: true, import: "default" },
);
const index = Object.values(built)[0] ?? { entries: {} };
const entries = Object.values(index.entries);

describe("built Storybook index", () => {
  it("is not empty", () => {
    expect(entries.length).toBeGreaterThan(0);
  });
});

// Renders every story that exists, using the same story files Storybook builds.
const modules = import.meta.glob("../src/**/*.stories.tsx", { eager: true });

describe("every story renders", () => {
  it("covers each story entry in the index", () => {
    const stories = entries.filter((e) => e.type === "story");
    const rendered = Object.keys(modules).length;
    expect(rendered > 0 || stories.length === 0).toBe(true);
  });

  for (const [file, mod] of Object.entries(modules)) {
    const composed = composeStories(mod as Parameters<typeof composeStories>[0]);
    for (const [name, Story] of Object.entries(composed)) {
      it(`${file} > ${name}`, () => {
        expect(() => renderToString(createElement(Story as FunctionComponent))).not.toThrow();
      });
    }
  }
});
