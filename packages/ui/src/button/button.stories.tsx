// Type-checked only until the Storybook app exists (P1-17); not yet run in a browser.
// TODO(decision: story-imports): stories import ./index because a package cannot import its own
// subpath before it is built; Storybook should alias @usecredo/ui/button to this entry.
import type { Meta, StoryObj } from "@storybook/react";
import { within } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { Button, type ButtonSize, type ButtonVariant } from "./index";

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
    // TODO(decision: docs-url): replace with the real docs page once the docs app exists (P1-18).
    docs: {
      description: {
        component:
          "Primary action control. Docs page: /docs/components/button. Design caveat: in light mode the primary fill is lime on white (about 1.3:1 against the page), so the default variant carries a border (`border-border-interactive`) to read as a shape. Revisit with the design owner.",
      },
    },
    links: [{ title: "Docs: Button", url: "/docs/components/button" }],
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
  parameters: { viewport: { defaultViewport: "mobile" } },
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();
    await user.tab();
    const button = canvas.getByRole("button");
    if (document.activeElement !== button) throw new Error("Tab should focus the button");
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    if (!button.textContent?.includes("Pressed 2")) throw new Error("Enter and Space should activate");
  },
};
