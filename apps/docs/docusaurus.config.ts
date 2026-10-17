import type { Config } from "@docusaurus/types";

// decision 0010: Docusaurus is the docs framework (Starlight is the documented fallback).
// decision 0006: the production host is https://credo.trekant.dev; DOCS_URL and DOCS_BASE_URL override it.
const config: Config = {
  title: "Credo",
  tagline: "Design tokens, React components and tooling",
  url: process.env.DOCS_URL ?? "https://credo.trekant.dev",
  baseUrl: process.env.DOCS_BASE_URL ?? "/",
  favicon: "img/favicon.svg",
  onBrokenLinks: "throw",
  onBrokenAnchors: "throw",
  onDuplicateRoutes: "throw",
  markdown: { hooks: { onBrokenMarkdownLinks: "throw" } },
  i18n: { defaultLocale: "en", locales: ["en"] },
  presets: [
    [
      "classic",
      {
        docs: { sidebarPath: "./sidebars.ts", routeBasePath: "/" },
        blog: false,
        theme: { customCss: "./src/css/custom.css" },
      },
    ],
  ],
  clientModules: ["./src/client/example-theme.ts"],
  plugins: ["./plugins/infima-layer.ts", "./plugins/design-system.ts"],
  themes: [
    [
      "@easyops-cn/docusaurus-search-local",
      { hashed: true, indexBlog: false, docsRouteBasePath: "/", language: ["en"] },
    ],
  ],
  themeConfig: {
    navbar: {
      title: "Credo",
      items: [{ type: "docSidebar", sidebarId: "main", label: "Docs", position: "left" }],
    },
    footer: { style: "dark", copyright: "MIT licence." },
    prism: { additionalLanguages: ["bash", "json", "css"] },
    colorMode: { respectPrefersColorScheme: true },
  } satisfies import("@docusaurus/preset-classic").ThemeConfig,
};

export default config;
