import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

// TODO(P1-18 wave 2): add Foundations > Tokens (generated) and Components > Button.
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
  ],
};

export default sidebars;
