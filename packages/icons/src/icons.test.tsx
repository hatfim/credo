import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as client from "./index";
import * as server from "./server";

describe("@usecredo/icons", () => {
  it("exports the same icon names from both entries", () => {
    const names = (m: object) => Object.keys(m).sort();
    expect(names(server)).toEqual(names(client));
    expect(names(client)).toContain("CircleNotchIcon");
  });

  it("renders the server entry to a string without a provider or context", () => {
    const html = renderToString(createElement(server.CircleNotchIcon, { size: 16, "aria-hidden": true }));
    expect(html).toContain("<svg");
    expect(html).toContain('width="16"');
    expect(html).toContain('aria-hidden="true"');
  });

  it("renders the client entry to a string", () => {
    expect(renderToString(createElement(client.CircleNotchIcon))).toContain("<svg");
  });
});
