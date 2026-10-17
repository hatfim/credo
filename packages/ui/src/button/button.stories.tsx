// Stories import the component source (./index) so Storybook and the story tests exercise the code
// under edit without a build. The docs site and consumers import the public path @usecredo/ui/button.
import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { Button, type ButtonSize, type ButtonVariant } from "./index";

// decision 0006: the docs host is https://credo.trekant.dev.
// The route is real: apps/docs/docs/components/button.mdx is served at /components/button.
const DOCS_PAGE = "https://credo.trekant.dev/components/button";

const variants: ButtonVariant[] = ["default", "secondary", "destructive", "outline", "ghost", "link"];
const sizes: ButtonSize[] = ["sm", "md", "lg"];

const meta = {
  title: "Components/Button",
  component: Button,
  tags: ["autodocs"],
  args: { children: "Button" },
  argTypes: {
    variant: { control: "select", options: variants },
    size: { control: "select", options: [...sizes, "icon"] },
    asChild: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Primary action control. Docs page with the API table: " + DOCS_PAGE + ". Design caveat: in light mode the primary fill is lime on white (about 1.3:1 against the page), so the default variant carries a border (`border-border-interactive`) to read as a shape. Revisit with the design owner.",
      },
    },
    links: [{ title: "Docs: Button", url: DOCS_PAGE }],
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

const row: React.CSSProperties = { display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" };

export const Default: Story = {};

export const Variants: Story = {
  render: (args) => (
    <div style={row}>
      {variants.map((v) => (
        <Button key={v} {...args} variant={v}>
          {v}
        </Button>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div style={row}>
      {sizes.map((s) => (
        <Button key={s} {...args} size={s}>
          {s}
        </Button>
      ))}
      <Button {...args} size="icon" aria-label="Add">
        +
      </Button>
    </div>
  ),
};

export const Disabled: Story = {
  render: (args) => (
    <div style={row}>
      {variants.map((v) => (
        <Button key={v} {...args} variant={v} disabled>
          {v}
        </Button>
      ))}
    </div>
  ),
};

export const Loading: Story = {
  render: (args) => (
    <div style={row}>
      {variants.map((v) => (
        <Button key={v} {...args} variant={v} loading>
          {v}
        </Button>
      ))}
    </div>
  ),
};

export const AsChild: Story = {
  render: (args) => (
    <Button {...args} asChild variant="secondary">
      <a href="#docs">Rendered as a link</a>
    </Button>
  ),
};

export const LongText: Story = {
  args: { children: "A very long label that should still read well on narrow screens and not break the layout" },
  globals: { viewport: { value: "mobile", isRotated: false } },
  decorators: [(Story) => <div style={{ maxWidth: "20rem" }}><Story /></div>],
};

/** All variants under each theme. Prefer the toolbar theme switcher; this pins each one. */
export const Themes: Story = {
  render: (args) => (
    <div style={{ display: "grid", gap: "1rem" }}>
      {["light", "dark", "second"].map((theme) => (
        <div key={theme} data-theme={theme} style={{ ...row, padding: "1rem" }}>
          {variants.map((v) => (
            <Button key={v} {...args} variant={v}>
              {theme} {v}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};

export const Keyboard: Story = {
  render: (args) => {
    const [count, setCount] = React.useState(0);
    return (
      <Button {...args} onClick={() => setCount((c) => c + 1)}>
        Pressed {count}
      </Button>
    );
  },
  // canvas and userEvent come from the play context (instrumented by Storybook, so the steps show
  // in the Interactions panel). Plain checks throw so the story fails in the browser and in tests.
  play: async ({ canvas, userEvent }) => {
    await userEvent.tab();
    const button = canvas.getByRole("button");
    if (document.activeElement !== button) throw new Error("Tab should focus the button");
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    if (!button.textContent?.includes("Pressed 2")) throw new Error("Enter and Space should activate");
  },
};
