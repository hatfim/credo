// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import Page from "../src/app/page";
import { ThemeShowcase } from "../src/app/theme-showcase";

afterEach(cleanup);

describe("next consumer: components from the installed packages", () => {
  it("renders Button in an element-scoped light and dark theme", () => {
    const { getByRole } = render(<ThemeShowcase />);
    for (const theme of ["light", "dark"] as const) {
      const region = getByRole("region", { name: `${theme} theme` });
      expect(region.getAttribute("data-theme")).toBe(theme);
      expect(region.querySelectorAll('[data-slot="button"]').length).toBeGreaterThanOrEqual(6);
    }
  });

  it("enters the loading state on click", () => {
    const { getAllByRole } = render(<ThemeShowcase />);
    const [first] = getAllByRole("button", { name: "Save" });
    fireEvent.click(first!);
    const busy = getAllByRole("button", { name: "Saving" });
    expect(busy.length).toBe(2);
    expect(busy[0]!.getAttribute("aria-busy")).toBe("true");
  });

  it("renders the server page, including the server-entry icon, to HTML", () => {
    const html = renderToString(<Page />);
    expect(html).toContain('data-testid="server-icon"');
    expect(html).toContain("<svg");
    expect(html).toContain('data-slot="button"');
  });
});
