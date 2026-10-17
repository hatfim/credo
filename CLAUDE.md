# Credo Design System

An organization-wide design system: design tokens, React components, documentation
and tooling that many projects adopt independently. It is a platform, not one app's
component library.

Source of truth, in this order: `docs/prd.md`, `docs/tasks.md`, `docs/decisions/`.
Follow them and do not invent scope. If they do not decide something, pick the most
conservative option, leave a `TODO(decision: <name>)` comment, and say so in your report.

## Stack

- pnpm workspaces, Turborepo. Node 22 or newer. pnpm is pinned through the root
  `packageManager` field. The lockfile is committed; CI installs with a frozen lockfile.
- React and TypeScript (strict). Peer range React 18 and 19, so components keep
  `forwardRef` until adoption data shows nobody is on React 18.
- Radix UI primitives, scoped `@radix-ui/react-*` packages (decision 0004). Follow shadcn/ui composition conventions: variant helpers,
  `asChild` through Slot, `data-slot` attributes, composed parts. Reference only, never
  copy source from other projects.
- Tailwind CSS v4 with CSS variables and `@theme inline`. Supported browsers are the
  ones Tailwind v4 supports. Tailwind v4 is required (tested 4.3.x); the precompiled
  stylesheet fallback is dropped for the MVP (decisions 0005 and 0009).
- Icons: Phosphor through `@phosphor-icons/react`, imported only inside `packages/icons`.
- Storybook (React, Vite) for the component catalog. Docusaurus for the docs site.
- Vitest and Testing Library for tests. Playwright for visual snapshots and docs checks.
- Changesets for versioning and releases. Public npm scope `@usecredo`. MIT licence.
- Repository on GitHub (`git@github.com:hatfim/credo.git`), CI on GitHub Actions, sites
  hosted on Vercel (docs site only; Storybook is not hosted). Trekant is the parent company, not part of any package name.

## Repository layout

```text
apps/docs           documentation site (private, deployed)
apps/storybook      Storybook (private, not deployed; dev and CI only)
packages/tokens     token source, build, theme validator        published
packages/tailwind-config  Tailwind mapping for the token contract  published
packages/ui         React components                            published
packages/icons      Phosphor re-exports, with server entry      published
packages/test-utils shared decorators, fixtures, test setup     private
packages/typescript-config, packages/eslint-config              private
consumers/*         simulate external apps; install packed tarballs only   private
```

## Rules that always apply

- Dependencies run one way: apps and consumers use packages, never the reverse.
  Packages never import from `apps/` or `consumers/`.
- No component code lives in `apps/`. Storybook and docs use the real components from
  `@usecredo/ui`, imported through the same public paths a consumer would use.
- Only documented exports are public. Each package has an `exports` map. No deep imports.
  Each component has its own subpath export (for example `@usecredo/ui/button`).
  JavaScript is ESM with `sideEffects: false`. Client components carry `use client`.
- Every published package and component must work in both Next.js (App Router, server
  rendering, server components) and pure React apps (Vite). No Next.js-only or Vite-only
  API in published code, and server-safe entries (such as `@usecredo/icons/server`) stay
  free of client code. `consumers/next-app` and `consumers/vite-app` must keep building
  and passing their smoke tests; breaking either is a defect. The Pages Router, other
  bundlers and React 18 on Next.js are not tested yet: do not claim support for them.
- Components read only semantic or component tokens, never color primitives or raw
  values. Scale tokens (spacing, radius, border width, typography styles) are part of the
  contract and may be read directly; they are not themed per mode.
  CSS variables carry one organization prefix, `--cr-` (accepted, decision 0004).
- The semantic contract uses the role taxonomy in the token file (`surface`, `content`,
  `field`, `actions`, `state`, `border`, `feedback`, `alpha`, `shadow`). shadcn/ui is a
  reference for component patterns only: do not copy its role names or add aliases for
  them. The role list lives in `docs/token-contract-v0.md`. Raw hex values are allowed
  only in `alpha.*` and `shadow.color.*`; everything else is an alias.
- Tokens come from `packages/tokens/generated/tokens.json`, synced from Figma by Tokens
  Studio onto the `tokens-sync` branch. Never edit that file by hand. Never commit
  generated CSS, types or schema; build output stays gitignored.
- No direct pushes to `main`, and no bypass for anyone. Every change arrives by pull
  request. A change to a published package needs a changeset.
- Pin every third-party GitHub Action to a version or commit SHA, never `@latest`.
- Accessibility target is WCAG 2.2 AA. Text pairs need 4.5:1 contrast and UI boundaries
  and focus rings need 3:1. Automated checks do not replace manual keyboard and screen
  reader review of new interactive components.
- Never publish packages, create or print secrets, or change repository settings
  yourself. Say what the owner has to do by hand.

## Definition of done for a stable component (PRD 7.3)

- Built on the Radix primitive where one exists. Typed public API, `ref` support,
  `className` support, `asChild` or slot composition where relevant.
- Works in light and dark. The second reference theme is deferred and no second brand
  is planned (decision 0005).
- Stories for every state it supports: default, variants and sizes, interactive,
  disabled and loading, error and validation, controlled and uncontrolled, keyboard
  (with a `play` function), themes, responsive, edge cases. Do not add states the
  component does not support.
- Unit tests, and interaction tests where it has behavior. No serious accessibility
  violations in Storybook checks.
- A docs page with a generated API table and links to its stories, and story
  parameters that link back to the docs page.
- Per-component entry point tree-shakes, and size impact is measured.
- A changeset entry.

## Commands

```text
pnpm dev             run both apps independently (use --filter for one)
pnpm build           build everything in dependency order
pnpm lint            lint, including import-boundary rules
pnpm typecheck       type check every workspace
pnpm test            unit and interaction tests
pnpm test:coverage   tests with coverage (thresholds only ratchet up)
pnpm check           lint, typecheck, test and build through Turborepo
pnpm clean           remove build output
```

If a command here does not exist yet, creating it is part of the task that introduces it.

## How to work in this repository

- One feature branch per batch of tasks, one commit per task, with the task ID in the
  message, for example `feat(P1-03): turborepo task graph`.
- Start each batch with a short plan and wait for approval before writing code.
- After each task run its acceptance check from `docs/tasks.md` and show the output.
  Do not say a task is done without evidence. Say plainly what you could not verify.
- Keep changes small and in scope. Do not refactor unrelated code or add dependencies
  without saying why and checking their size and licence.
- Prefer editing existing files over creating new ones. Do not write long comments
  that restate the code.
- Store working notes and decisions in `docs/`, not in code comments.

## Decisions still pending

The Phase 0 decisions are settled by decision records 0004 to 0008 (CSS prefix `--cr-`,
tsup, scoped Radix, `use client` per entry, Tailwind v4 required, fonts, release policy,
token sync operations) and spikes A to C by 0009 to 0011. See `docs/decisions/`. Replace
their remaining `TODO(decision: ...)` markers with a reference to the record when you
touch the file.

Still open; until settled use the conservative option and mark a `TODO(decision: ...)`:

- Toast approach (Radix Toast or the library shadcn/ui now uses), decided in P2-09.
- `vercel-deploy-method`: keep the CLI production deploy until the first dry run settles
  the Root Directory case (decision 0007).

## Token pipeline in one paragraph

Designers edit tokens in Figma with Tokens Studio, which pushes `tokens.json` to the
`tokens-sync` branch. A workflow validates the raw file (JSON, token shape, alias
resolution), builds it with Style Dictionary and the Tokens Studio transforms, runs a
strict WCAG contrast check, then opens or updates a pull request into `main`. The
build, test and visual checks run as that pull request's required checks. The plugin
uses the free plan, so there is a single file and no Themes feature: light and dark
are separate token sets (the second reference theme is deferred, decision 0005).

## Where things are decided

- Scope, requirements and traceability: `docs/prd.md`.
- Tasks with acceptance checks: `docs/tasks.md`.
- Decision records: `docs/decisions/`.
- Adoption baselines and eligible projects: `docs/adoption/`.
