import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { expectNoA11yViolations } from "./a11y";
import { themes, viewports, withTheme } from "./index";

const Story = () => createElement("button", { type: "button" }, "Go");

describe("withTheme", () => {
  it("wraps the story with data-theme from globals", () => {
    render(withTheme(Story, { globals: { theme: "dark" } }));
    expect(screen.getByTestId("theme-root")).toHaveAttribute("data-theme", "dark");
  });

  it("lets story parameters pin a theme and falls back to light", () => {
    const { unmount } = render(withTheme(Story, { parameters: { theme: "second" }, globals: { theme: "dark" } }));
    expect(screen.getByTestId("theme-root")).toHaveAttribute("data-theme", "second");
    unmount();
    render(withTheme(Story, { globals: { theme: "nonsense" } }));
    expect(screen.getByTestId("theme-root")).toHaveAttribute("data-theme", "light");
  });

  it("lists light, dark and the second theme, plus viewports", () => {
    expect(themes).toEqual(["light", "dark", "second"]);
    expect(Object.keys(viewports)).toEqual(["mobile", "tablet", "desktop"]);
  });
});

describe("expectNoA11yViolations", () => {
  it("passes for an accessible button", async () => {
    const { container } = render(createElement(Story));
    await expectNoA11yViolations(container);
  });

  it("fails for an unlabelled button", async () => {
    const { container } = render(createElement("button", { type: "button" }));
    await expect(expectNoA11yViolations(container)).rejects.toThrow(/button-name/);
  });
});
