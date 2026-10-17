import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  main: [
    "intro",
    {
      type: "category",
      label: "Getting started",
      items: [
        "getting-started/install",
        "getting-started/theme",
        "getting-started/stylesheet",
        "getting-started/first-component",
      ],
    },
    { type: "category", label: "Foundations", items: ["foundations/tokens"] },
    { type: "category", label: "Components", items: ["components/button"] },
  ],
};

export default sidebars;
