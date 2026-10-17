import type { Decorator, Preview } from "@storybook/react-vite";
import { themeGlobalType, viewports, withTheme } from "@usecredo/test-utils";
import "./styles.css";

// decision 0005: the second reference theme is deferred (no second brand is planned). Until it
// exists, selecting "second" shows the light values (the variables fall back to :root).
const preview: Preview = {
  // withTheme reads globals.theme (toolbar) and sets data-theme on a wrapper, never on <html>.
  decorators: [withTheme as Decorator],
  globalTypes: themeGlobalType,
  initialGlobals: { theme: "light" },
  parameters: {
    layout: "centered",
    viewport: { options: viewports },
    a11y: { test: "error" },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export default preview;
