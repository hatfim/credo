# Credo

An organization-wide design system: design tokens, React components, documentation and tooling that many projects adopt independently. It is a platform, not one app's component library.

> **Status: pre-release.** Phase 1 (repository, token pipeline, Button, Storybook and docs apps) is done. All packages are at `0.0.0` and not published yet, so there is nothing to install from npm.

## Packages

Published scope: `@usecredo` (MIT).

| Package | What it is | Published |
| --- | --- | --- |
| [`@usecredo/tokens`](packages/tokens) | Token source, build (CSS variables, types, schema), validator and contrast CLI | yes |
| [`@usecredo/tailwind-config`](packages/tailwind-config) | Tailwind v4 mapping for the token contract | yes |
| [`@usecredo/ui`](packages/ui) | React components (Button so far), one subpath export per component | yes |
| [`@usecredo/icons`](packages/icons) | Phosphor re-exports, with a server entry | yes |
| `@usecredo/test-utils` | Shared Storybook decorators, Vitest setup, accessibility helper | private |
| `@usecredo/typescript-config`, `@usecredo/eslint-config` | Shared tooling config | private |

Apps and consumers:

| Path | What it is |
| --- | --- |
| [`apps/docs`](apps/docs) | Documentation site (Docusaurus) |
| [`apps/storybook`](apps/storybook) | Component catalog (Storybook, React and Vite) |
| [`consumers/*`](consumers) | Simulated external apps (Vite, Next.js); install packed tarballs only |

## Getting started (contributors)

Requirements: Node 22 or newer and pnpm (pinned through the `packageManager` field in `package.json`).

```sh
pnpm install --frozen-lockfile
pnpm check        # lint, typecheck, test, build, Storybook smoke test, docs link checks
pnpm dev          # run the docs site and Storybook (use --filter for one)
```

| Command | What it does |
| --- | --- |
| `pnpm build` | Build everything in dependency order |
| `pnpm lint` | Lint, including import-boundary rules, and check shared dependency versions |
| `pnpm typecheck` | Type check every workspace |
| `pnpm test` | Unit and interaction tests |
| `pnpm check` | Everything above, plus the Storybook smoke test and the docs and cross-link checks |
| `pnpm clean` | Remove build output |

## How tokens work

Designers edit tokens in Figma with Tokens Studio, which pushes `packages/tokens/generated/tokens.json` to the `tokens-sync` branch. That file is never edited by hand. The build turns it into prefixed CSS variables (`--cr-…`), TypeScript types and a JSON schema, and the validator and contrast CLI check it against WCAG 2.2 AA (run `pnpm build` first):

```sh
cd packages/tokens
node dist/cli.js validate
node dist/cli.js contrast
node dist/cli.js contract --check
```

Components read only semantic roles (`surface`, `content`, `field`, `actions`, `state`, `border`, `feedback`, `alpha`, `shadow`). See [`docs/token-contract-v0.md`](docs/token-contract-v0.md).

## Documentation

| Where | What |
| --- | --- |
| [`docs/prd.md`](docs/prd.md) | Product requirements |
| [`docs/tasks.md`](docs/tasks.md) | Tasks by phase, with acceptance checks |
| [`docs/decisions/`](docs/decisions) | Decision records |
| [`docs/token-contract-v0.md`](docs/token-contract-v0.md) | Token roles and naming rules |
| [`docs/contributing/component-conventions.md`](docs/contributing/component-conventions.md) | How components are built |
| [`CLAUDE.md`](CLAUDE.md) | Project rules for contributors and agents |

## Contributing

- Every change arrives by pull request; direct pushes to `main` are blocked.
- A change to a published package needs a changeset (`pnpm changeset`).
- Dependencies run one way: apps and consumers use packages, never the reverse. No component code lives in `apps/`.
- A stable component needs stories, tests, a docs page and keyboard and accessibility checks (see PRD section 7.3).

## Licence

[MIT](LICENSE), copyright Trekant. Each package's `package.json` declares the same licence.
