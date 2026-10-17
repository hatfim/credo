import { cleanup, render, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../src/App";

afterEach(cleanup);

describe("vite consumer: Button from the installed @usecredo/ui", () => {
  it("renders every variant in both an element-scoped light and dark theme", () => {
    const { getByRole } = render(<App />);
    for (const theme of ["light", "dark"] as const) {
      const region = getByRole("region", { name: `${theme} theme` });
      expect(region.getAttribute("data-theme")).toBe(theme);
      const buttons = Array.from(region.querySelectorAll('[data-slot="button"]'));
      const variants = buttons.map((b) => b.getAttribute("data-variant"));
      expect(variants).toEqual(expect.arrayContaining(["default", "secondary", "destructive", "outline", "ghost", "link"]));
    }
  });

  it("shows the loading state and keeps the app's own button outside Credo", () => {
    const { getAllByRole, getAllByText } = render(<App />);
    const loading = getAllByRole("button", { name: "Saving" });
    expect(loading).toHaveLength(2);
    for (const b of loading) {
      expect(b.getAttribute("aria-busy")).toBe("true");
      expect(b.getAttribute("data-loading")).toBe("true");
      expect(within(b).queryByText("Saving")).not.toBeNull();
    }
    const own = getAllByText("App button")[0]!;
    expect(own.getAttribute("data-slot")).toBeNull();
  });
});
