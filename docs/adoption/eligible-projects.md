# Eligible projects

Projects the owner declares eligible for Credo adoption (PRD D-13, task P0-08). An eligible project is one the owner expects to adopt Credo and agrees to measure. The adoption metric counts eligible projects at adoption level 2 or higher (tokens plus at least one shared component in production), so this list is the denominator.

Facts below were read from each repository's manifests and config. Re-check them when a project's stack changes.

| Project | Repository | Status | Framework | React | Tailwind | Package manager | Hosting | Declared | Checked |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Switchback | `git@github.com:hatfim/switchback.git` | in development, not in production | Next.js 16.4.1, App Router (`src/app`) | 19.3.1 | planned (not installed yet) | pnpm 10.17.1 workspaces, Turborepo 2.11.6 | Vercel | 2026-10-17 (owner) | 2026-10-17, commit `59e5664` |

## Switchback

- **Role:** the first project to adopt Credo (owner, 2026-10-17). It is the intended candidate for P3-05 (first real adoption, level 2) and the first real project to add as a consumer once it reaches level 2 and agrees to be tested.
- **Status:** still in development, not yet in production (owner, 2026-10-17). It can reach adoption level 2 only once Credo tokens and at least one shared component run in production, so for now it counts as eligible but at level 0. Because there is no production UI to migrate, adopting early costs the least and gives the cleanest baseline.
- **Workspaces:** `apps/web` (Next.js) plus `packages/db`, `packages/engine` and `packages/gpx`, all private. TypeScript ^5.6, Vitest ^2.1.
- **UI today:** 14 `.tsx` files, 7 components in `apps/web/src/components` (forms, buttons, a controls panel, route upload). No Tailwind yet, no CSS files, no CSS modules and no `className` usage. Styling is inline `style` objects (for example the root layout) and the PDF renderer's own styles. There is no design system or token layer yet.
- **Fit with Credo:**
  - React 19 and Next.js App Router match the supported range, and the `next-app` consumer covers the same setup.
  - The project has no Tailwind today, but the owner will adopt it (2026-10-17). It should start on Tailwind v4 so it matches Credo's `@usecredo/tailwind-config`, which removes the need for the precompiled stylesheet fallback for this project. One project does not settle `TODO(decision: precompiled-stylesheet)` or `TODO(decision: tailwind-minimum)`; record it as input to spike A.
  - Server components can import icons from `@usecredo/icons/server`. Client components such as the forms would use `@usecredo/ui`.
  - `transpilePackages` and `outputFileTracingRoot` in `next.config.ts` are already set for a monorepo on Vercel.
- **Baseline numbers (P0-09):** not recorded yet. Still needed: duplicated components, an accessibility check on sample screens, and setup time for UI foundations in a recent project.

## How to add a project

Add a row with the framework, React version and Tailwind status read from the project's manifests, the owner's declaration date and the commit checked. Add a section only if the project needs notes. Metric baselines go in `docs/adoption/baselines.md` (P0-09).
