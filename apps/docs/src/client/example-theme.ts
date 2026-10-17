// Theme toggle for live examples, in plain DOM so no component is defined in this app.
//
// Pages mark a frame as `<div class="credo-example-frame"><div class="credo-example" data-theme="light">`.
// This module adds a light/dark toolbar to each frame and sets `data-theme` on the
// `.credo-example` element only, never on <html>: Docusaurus owns <html data-theme> for its own
// colour mode, and the token stylesheet re-declares its variables on the nearest [data-theme]
// element, so the example wins inside its frame. Until a reader picks a theme the example follows
// the site colour mode.
import type { ClientModule } from "@docusaurus/types";

const THEMES = ["light", "dark"] as const;
type Theme = (typeof THEMES)[number];

const siteTheme = (): Theme => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");

function apply(frame: HTMLElement, theme: Theme): void {
  frame.querySelector(".credo-example")?.setAttribute("data-theme", theme);
  frame.querySelectorAll<HTMLButtonElement>("[data-credo-theme]").forEach((button) => {
    const pressed = button.dataset["credoTheme"] === theme;
    button.setAttribute("aria-pressed", String(pressed));
    button.className = `button button--sm ${pressed ? "button--primary" : "button--secondary"}`;
  });
}

function enhance(): void {
  document.querySelectorAll<HTMLElement>(".credo-example-frame:not([data-credo-ready])").forEach((frame) => {
    frame.dataset["credoReady"] = "true";
    const toolbar = document.createElement("div");
    toolbar.className = "credo-example-toolbar";
    toolbar.setAttribute("role", "group");
    toolbar.setAttribute("aria-label", "Example theme");
    for (const theme of THEMES) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = theme;
      button.dataset["credoTheme"] = theme;
      button.addEventListener("click", () => {
        frame.dataset["credoPicked"] = "true";
        apply(frame, theme);
      });
      toolbar.append(button);
    }
    frame.prepend(toolbar);
    apply(frame, siteTheme());
  });
}

let observing = false;
function followSiteTheme(): void {
  if (observing) return;
  observing = true;
  new MutationObserver(() => {
    document
      .querySelectorAll<HTMLElement>(".credo-example-frame[data-credo-ready]:not([data-credo-picked])")
      .forEach((frame) => apply(frame, siteTheme()));
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
}

const clientModule: ClientModule = {
  onRouteDidUpdate() {
    enhance();
    followSiteTheme();
  },
};

export default clientModule;
