import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

// Selected set, kept small on purpose. Every id must exist in the built index.json.
const SELECTED = [
  "components-button--default",
  "components-button--variants",
  "components-button--sizes",
  "components-button--disabled",
  "components-button--loading",
];
const THEMES = ["light", "dark"] as const;

const index = JSON.parse(readFileSync(resolve(import.meta.dirname, "../storybook-static/index.json"), "utf8")) as {
  entries: Record<string, { type: string }>;
};
const missing = SELECTED.filter((id) => index.entries[id]?.type !== "story");

test.describe("visual", () => {
  test("selected stories exist in the Storybook index", () => {
    expect(missing, "stories listed in visual/stories.spec.ts but absent from index.json").toEqual([]);
  });

  for (const id of SELECTED) {
    for (const theme of THEMES) {
      test(`${id} (${theme})`, async ({ page }) => {
        await page.goto(`/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`);
        await page.locator("body.sb-show-main").waitFor();
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator("#storybook-root")).toHaveScreenshot(`${id}--${theme}.png`);
      });
    }
  }
});
