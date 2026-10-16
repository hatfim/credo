"use client";

import { Slot } from "@radix-ui/react-slot"; // TODO(decision: radix-packaging)
import { CircleNotchIcon } from "@usecredo/icons";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../lib/cn";

/**
 * Design caveat (not fixed here): in light mode the primary fill is lime on a white page,
 * about 1.3:1, so the fill alone does not read as a shape. The default variant therefore
 * carries a `border-border-interactive` border. Revisit with the design owner.
 */
export const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap border font-medium",
    "transition-colors select-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-state-focus-ring-offset",
    "disabled:pointer-events-none disabled:border-state-disabled-border disabled:bg-state-disabled-background disabled:text-state-disabled-foreground",
    "aria-disabled:pointer-events-none aria-disabled:border-state-disabled-border aria-disabled:bg-state-disabled-background aria-disabled:text-state-disabled-foreground",
    "data-[loading=true]:border-state-loading-border data-[loading=true]:bg-state-loading-background data-[loading=true]:text-state-loading-foreground",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        default:
          "border-border-interactive bg-actions-primary-default text-actions-primary-foreground hover:bg-actions-primary-hover active:bg-actions-primary-pressed",
        secondary:
          "border-transparent bg-actions-secondary-default text-actions-secondary-foreground hover:bg-actions-secondary-hover active:bg-actions-secondary-pressed",
        destructive:
          "border-transparent bg-actions-destructive-default text-actions-destructive-foreground hover:bg-actions-destructive-hover active:bg-actions-destructive-pressed",
        outline:
          "border-border-interactive bg-transparent text-content-primary hover:bg-actions-secondary-subtle-hover active:bg-actions-secondary-subtle-pressed",
        ghost:
          "border-transparent bg-transparent text-content-primary hover:bg-actions-secondary-subtle-hover active:bg-actions-secondary-subtle-pressed",
        link: "border-transparent bg-transparent text-content-link underline-offset-4 hover:underline disabled:bg-transparent aria-disabled:bg-transparent",
      },
      size: {
        sm: "h-8 rounded-md px-3 text-sm",
        md: "h-10 rounded-md px-4 text-sm",
        lg: "h-12 rounded-lg px-6 text-base",
        icon: "size-10 rounded-md p-0 text-sm",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

export interface ButtonProps
  extends React.ComponentPropsWithoutRef<"button">,
    VariantProps<typeof buttonVariants> {
  /** Render the single child element instead of a `button`, merging props onto it (Radix Slot). */
  asChild?: boolean;
  /**
   * Shows a spinner, sets `aria-busy` and ignores activation. The button stays focusable
   * (`aria-disabled`) so assistive technology can still reach it. With `asChild` no spinner is
   * injected; the state attributes and click blocking still apply.
   */
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, loading = false, disabled, onClick, children, type, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  const inactive = loading || Boolean(disabled);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (loading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  };

  return (
    <Comp
      type={asChild ? type : (type ?? "button")}
      {...props}
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      onClick={handleClick}
      // Native `disabled` for plain buttons; aria-disabled for loading and for asChild targets.
      disabled={asChild ? undefined : disabled}
      aria-disabled={inactive || undefined}
      aria-busy={loading || undefined}
      data-slot="button"
      data-variant={variant ?? "default"}
      data-size={size ?? "md"}
      data-loading={loading ? "true" : undefined}
      data-disabled={inactive ? "" : undefined}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? (
            <CircleNotchIcon aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
          ) : null}
          {children}
        </>
      )}
    </Comp>
  );
});
Button.displayName = "Button";
