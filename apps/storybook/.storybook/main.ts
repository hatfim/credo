import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import { mergeConfig } from "vite";

const config: StorybookConfig = {
  core: { disableTelemetry: true },
  framework: "@storybook/react-vite",
  // Component stories live next to their component in packages/ui; this app holds no components.
  stories: ["../src/**/*.mdx", "../../../packages/ui/src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  typescript: { reactDocgen: "react-docgen-typescript" },
  viteFinal: (viteConfig) => mergeConfig(viteConfig, { plugins: [tailwindcss()] }),
};

export default config;
