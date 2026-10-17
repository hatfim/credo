import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// Interim: eslint-config blocks ui -> test-utils for every file. Needs a test-file exception (reported to lead).
// eslint-disable-next-line no-restricted-imports
import { expectNoA11yViolations } from "@usecredo/test-utils/a11y";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { cn } from "../lib/cn";
import { Button, buttonVariants, type ButtonSize, type ButtonVariant } from "./index";

const variants: ButtonVariant[] = ["default", "secondary", "destructive", "outline", "ghost", "link"];
const sizes: ButtonSize[] = ["sm", "md", "lg", "icon"];

describe("Button", () => {
  it("renders a button with defaults and data-slot", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("data-slot", "button");
    expect(button).toHaveAttribute("data-variant", "default");
    expect(button).toHaveAttribute("data-size", "md");
    expect(button).toHaveClass("bg-actions-primary-default", "text-actions-primary-foreground", "border-border-interactive");
    expect(button).toHaveClass("hover:bg-actions-primary-hover", "active:bg-actions-primary-pressed");
  });

  it.each(variants)("applies the %s variant", (variant) => {
    render(<Button variant={variant}>x</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-variant", variant);
    expect(button.className).toBe(cn(buttonVariants({ variant })));
  });

  it("maps variants to their semantic roles", () => {
    expect(buttonVariants({ variant: "secondary" })).toContain("bg-actions-secondary-default");
    expect(buttonVariants({ variant: "destructive" })).toContain("bg-actions-destructive-default");
    expect(buttonVariants({ variant: "outline" })).toContain("border-border-interactive");
    expect(buttonVariants({ variant: "ghost" })).toContain("text-content-primary");
    expect(buttonVariants({ variant: "link" })).toContain("text-content-link");
  });

  it.each(sizes)("applies the %s size", (size) => {
    render(<Button size={size}>x</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("data-size", size);
    expect(buttonVariants({ size })).toMatch(size === "icon" ? /size-10/ : /h-(8|10|12)/);
  });

  it("reads colour only from semantic token utilities", () => {
    const neutral = new Set(["transparent", "sm", "base", "0", "1", "2"]);
    const classes = variants
      .flatMap((variant) => buttonVariants({ variant }).split(/\s+/))
      .map((c) => c.split(":").pop() ?? c);
    for (const c of classes) {
      const m = /^(?:bg|text|border|ring-offset|ring)-(.+)$/.exec(c);
      if (m?.[1] && !neutral.has(m[1]) && !m[1].startsWith("[")) {
        expect(m[1], c).toMatch(/^(actions|state|border|content|surface|field|feedback)-/);
      }
    }
    expect(classes.join(" ")).not.toMatch(/#[0-9a-f]{3,8}|\[|palette|scale-/i);
  });

  it("merges className last so consumers can override", () => {
    render(<Button className="px-8 custom">x</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("px-8", "custom");
    expect(button).not.toHaveClass("px-4");
  });

  it("forwards the ref", () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>x</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("calls onClick and supports submit type", async () => {
    const onClick = vi.fn();
    render(<Button type="submit" onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("activates from the keyboard", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await userEvent.tab();
    expect(screen.getByRole("button")).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("does not fire onClick when disabled and leaves the tab order", async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Go</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveClass("disabled:bg-state-disabled-background", "disabled:text-state-disabled-foreground");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    await userEvent.tab();
    expect(button).not.toHaveFocus();
  });

  describe("loading", () => {
    it("sets aria-busy, shows a hidden spinner and blocks activation but stays focusable", async () => {
      const onClick = vi.fn();
      render(<Button loading onClick={onClick}>Saving</Button>);
      const button = screen.getByRole("button", { name: "Saving" });
      expect(button).toHaveAttribute("aria-busy", "true");
      expect(button).toHaveAttribute("aria-disabled", "true");
      expect(button).toHaveAttribute("data-loading", "true");
      expect(button).not.toBeDisabled();
      expect(button).toHaveClass("data-[loading=true]:bg-state-loading-background");
      const spinner = button.querySelector("svg");
      expect(spinner).toHaveAttribute("aria-hidden", "true");
      expect(spinner).toHaveClass("animate-spin", "motion-reduce:animate-none");
      await userEvent.click(button);
      await userEvent.tab();
      await userEvent.keyboard("{Enter}");
      expect(onClick).not.toHaveBeenCalled();
    });

    it("has no busy state and no spinner by default", () => {
      render(<Button>Save</Button>);
      const button = screen.getByRole("button");
      expect(button).not.toHaveAttribute("aria-busy");
      expect(button.querySelector("svg")).toBeNull();
    });
  });

  describe("asChild", () => {
    it("renders the child element with merged props, classes and ref", async () => {
      const onClick = vi.fn();
      const ref = React.createRef<HTMLButtonElement>();
      render(
        <Button asChild variant="secondary" className="extra" onClick={onClick} ref={ref}>
          <a href="/docs">Docs</a>
        </Button>,
      );
      const link = screen.getByRole("link", { name: "Docs" });
      expect(link).toHaveAttribute("href", "/docs");
      expect(link).toHaveAttribute("data-slot", "button");
      expect(link).toHaveClass("bg-actions-secondary-default", "extra");
      expect(link).not.toHaveAttribute("type");
      expect(ref.current).toBe(link);
      await userEvent.click(link);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("marks an inactive child with aria-disabled and blocks loading clicks", async () => {
      const onClick = vi.fn();
      render(
        <Button asChild loading onClick={onClick}>
          <a href="/docs">Docs</a>
        </Button>,
      );
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("aria-busy", "true");
      expect(link).toHaveAttribute("aria-disabled", "true");
      expect(link.querySelector("svg")).toBeNull();
      await userEvent.click(link);
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  it("has no detectable accessibility violations in each state", async () => {
    const { container } = render(
      <div>
        {variants.map((v) => (
          <Button key={v} variant={v}>
            {v}
          </Button>
        ))}
        <Button disabled>Disabled</Button>
        <Button loading>Loading</Button>
        <Button size="icon" aria-label="Add">
          +
        </Button>
        <Button asChild>
          <a href="/x">Link</a>
        </Button>
      </div>,
    );
    await expectNoA11yViolations(container);
  });
});
