# Component conventions

Rules every component in `@usecredo/ui` follows (CMP-01, CMP-02). shadcn/ui is a pattern
reference only; no source or role names are copied from it.

## Layout

```text
packages/ui/src/<name>/<name>.tsx          component
packages/ui/src/<name>/<name>.test.tsx     unit tests
packages/ui/src/<name>/<name>.stories.tsx  stories (next to the component)
packages/ui/src/<name>/index.ts            the subpath entry (public)
packages/ui/src/lib/                       internal helpers, not exported
```

Each component is one subpath export (`@usecredo/ui/<name>`) in `package.json`, one tsup
entry, and has no side effects (`sideEffects: false`). Nothing outside the `exports` map is
public. Components import each other only through their own entry, never through `src/`.

## Class-merge helper: `cn`

`src/lib/cn.ts` combines `clsx` (conditional classes) and `tailwind-merge` (the last
conflicting Tailwind utility wins). Always pass the caller's `className` last so consumers
can override.

```ts
className={cn(buttonVariants({ variant, size }), className)}
```

## Variant helper: `class-variance-authority`

Variants and sizes are declared with `cva`. It is small (under 1 kB), typed, and gives
`VariantProps<typeof x>` for the public prop types. Alternatives (tailwind-variants) add more
runtime for features we do not need. Export the helper (`buttonVariants`) from the component
entry so other components and consumers can style links as buttons. Variant classes use only
utilities that map to semantic or component tokens (`bg-actions-primary-default`), never
palette utilities, hex values or arbitrary values.

## `asChild` through Slot

Where a component renders one element that consumers may want to swap (links, router links),
add `asChild?: boolean` and render `Slot` from `@radix-ui/react-slot` instead of the default
tag. Slot merges props, `className` and refs onto the single child. When `asChild` is set,
behaviour that only makes sense on the native element (such as `disabled`) must also be
expressed as `aria-*` and `data-*` attributes.

`TODO(decision: radix-packaging)`: scoped `@radix-ui/react-*` packages until the decision
record picks between them and the unified `radix-ui` package.

## `data-slot`

Every rendered part carries `data-slot="<component>"` or `data-slot="<component>-<part>"`
(for example `button`, `dialog-content`). Consumers and tests target parts through it.
State is exposed as data attributes (`data-variant`, `data-size`, `data-loading`), set before
the caller's props so a consumer cannot remove the slot by accident.

## `forwardRef`

Use `React.forwardRef` and set `displayName`. React 18 does not pass `ref` as a prop, and the
peer range is React 18 and 19. Remove it only when adoption data shows nobody is on 18.
Props extend the native element's props (`React.ComponentPropsWithoutRef<"button">`) and
spread onto the root element.

## `use client`

A component that uses state, effects, context or event handlers starts with `"use client";`
so it works under React Server Components. Pure markup components may omit it. The directive
must be the first statement of the entry module, and the build must keep it (check the
`dist/<name>.js` output when adding a component).

## Tokens and accessibility

Read only semantic or component token utilities. Focus uses the `state.focus` ring tokens and
must reach 3:1 against its surroundings. Interactive components need a keyboard `play`
function in their stories and an axe check in unit tests (`@usecredo/test-utils`).

## Definition of done

See `CLAUDE.md` (PRD 7.3): stories per state, unit and interaction tests, light, dark and
second-theme rendering, API documented in types, size measured, changeset.
