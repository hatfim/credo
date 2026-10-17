import { createElement, type ReactElement } from "react";

/**
 * Theme names, switched by the `data-theme` attribute on an ancestor element.
 * decision 0005: the second reference theme is deferred; "second" is a placeholder name.
 */
export const themes = ["light", "dark", "second"] as const;
export type Theme = (typeof themes)[number];
export const defaultTheme: Theme = "light";

/** Toolbar definition for Storybook `globalTypes`. */
export const themeGlobalType = {
  theme: {
    description: "Theme, applied as data-theme on a wrapper element",
    toolbar: {
      title: "Theme",
      icon: "paintbrush",
      items: themes.map((value) => ({ value, title: value })),
      dynamicTitle: true,
    },
  },
} as const;

/** Structural subset of Storybook's decorator context, so this package needs no Storybook dependency. */
type DecoratorContext = { globals?: Record<string, unknown>; parameters?: Record<string, unknown> };

/**
 * Storybook decorator. Reads `globals.theme` (toolbar), or `parameters.theme` to pin a story
 * to one theme. Usage in `.storybook/preview.tsx`:
 * `export const decorators = [withTheme]; export const globalTypes = themeGlobalType;`
 */
export function withTheme(
  Story: () => ReactElement,
  context: DecoratorContext = {},
): ReactElement {
  const requested = context.parameters?.["theme"] ?? context.globals?.["theme"];
  const theme: Theme = themes.includes(requested as Theme) ? (requested as Theme) : defaultTheme;
  return createElement(
    "div",
    { "data-theme": theme, "data-testid": "theme-root", style: { padding: "1rem", minHeight: "100%" } },
    createElement(Story),
  );
}

/** Viewport presets in Storybook's viewport-addon shape (responsive stories, PRD 9.3). */
export const viewports = {
  mobile: { name: "Mobile", styles: { width: "375px", height: "667px" } },
  tablet: { name: "Tablet", styles: { width: "768px", height: "1024px" } },
  desktop: { name: "Desktop", styles: { width: "1280px", height: "800px" } },
} as const;
