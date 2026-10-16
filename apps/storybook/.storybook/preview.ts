import type { Decorator, Preview } from "@storybook/react-vite";
// Placeholder stylesheet; see the file for what it switches on in Wave 2.
import "./styles.css";

// TODO(decision: second-theme): the second reference theme has no name or tokens yet.
export const THEMES = ["light", "dark", "second"] as const;

const withTheme: Decorator = (Story, context) => {
  document.documentElement.setAttribute("data-theme", String(context.globals.theme));
  return Story();
};

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: "Theme (sets the data-theme attribute)",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        dynamicTitle: true,
        items: THEMES.map((value) => ({ value, title: value })),
      },
    },
  },
  initialGlobals: { theme: "light" },
  parameters: {
    layout: "centered",
    a11y: { test: "error" },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export default preview;
