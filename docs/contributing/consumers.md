# Representative consumers

Two private apps in `consumers/` simulate external adopters (PRD 13.4, DST-08, DST-09):

| Consumer | What it covers |
| --- | --- |
| `vite-app` | Vite single-page app with its own Tailwind v4 setup (own `@theme`, own utilities) and its own CSS variables (`--background`, `--primary`, `--radius`). Renders Button in an element-scoped `data-theme="light"` and `data-theme="dark"` region. This is the DST-09 coexistence check. |
| `next-app` | Next.js App Router app. A server component imports an icon from `@usecredo/icons/server` (never the client entry), and a client component renders Button in light and dark. Production `next build`. |

## How the isolated job works

`pnpm test:consumers` runs `scripts/consumers/run.mjs`. It is not part of `pnpm check`
because it needs the network (third-party packages) and a registry process.

1. Builds the four published packages (`tokens`, `tailwind-config`, `icons`, `ui`) with Turborepo.
2. `pnpm pack` each one into a temporary directory. The workspace protocol is rewritten by
   pack, and the script fails if any packed manifest still contains `workspace:` or a
   `publishConfig.registry`.
3. Starts Verdaccio (pinned, MIT, devDependency in the root) on `127.0.0.1` with a random port.
   `@usecredo/*` has no uplink, so those names can never resolve from or be published to
   npmjs.org. Other packages are proxied read-only so the consumers can install their own
   dependencies.
4. Publishes the tarballs with `npm publish --registry=http://127.0.0.1:<port>`, using a
   throwaway `--userconfig` and an empty `--globalconfig`. Every inherited `npm_*` variable,
   `NODE_AUTH_TOKEN` and `NPM_TOKEN` is removed from the child environment, and the script
   refuses any registry that is not `http://127.0.0.1`.
5. Copies each consumer to its own temporary directory (no `node_modules`, no workspace
   file, private tooling packages removed), points `@usecredo/*` at the packed version,
   installs with no lockfile, then asserts that nothing is linked and that the lockfile
   integrity of each `@usecredo/*` package equals the hash of the tarball packed in step 2.
6. Runs `pnpm run build` and `pnpm run test` in that directory.

The install, build and test children run with `HOME` set to an empty directory, throwaway
user and global npm config, no token variables, and `@usecredo:registry` pinned to the local
registry in the consumer `.npmrc`, so a developer or CI `~/.npmrc` cannot redirect `@usecredo/*`.
The install is retried once on failure (logged).

Verdaccio is dev-only: `pnpm audit` reports advisories for it (3 high, 1 critical). It listens
on loopback for the length of one test run and is never published or deployed.

Third-party versions come from the repository catalog: the temporary workspace file is the
root `pnpm-workspace.yaml` without its `packages` list, so `catalog:` specifiers resolve to
the same versions as in the repository.

The same `build` and `test` scripts also run against workspace links inside `pnpm check`
(Turborepo builds the consumer before its tests). That is a quick regression signal only;
the isolated run is the one that proves the packed artifacts work.

## What the smoke tests assert

- Both: Button renders in light and dark regions, the loading state sets `aria-busy`, and the
  production output exists.
- `vite-app` (`test/build.test.ts` reads the built stylesheet): `bg-surface-page`,
  `text-content-primary` and other `tailwind-config` utilities resolve to `var(--cr-*)`
  (closes the deferred P1-11 check); Button utilities are generated from the installed
  `@usecredo/ui`; both theme blocks are present; every `--cr-*` variable appears exactly as in
  the token stylesheet and the app declares none; the app's own variables and utilities
  (`--primary`, `bg-primary`, `app-card`) keep the app's values and never point at a `--cr-*`
  variable (DST-09).
- `next-app`: the prerendered HTML contains the server-entry icon SVG and both themed
  regions, the stylesheet contains Credo and Button utilities, and `page.tsx` imports
  `@usecredo/icons/server` (closes the deferred P1-15 check).

## Run locally

```sh
pnpm install
pnpm test:consumers                 # build packages, then both consumers
pnpm test:consumers --only vite-app
pnpm test:consumers --skip-build    # reuse existing dist output
pnpm test:consumers --keep          # keep the temporary directory for inspection
```

Needs Node 22, network access to npmjs.org for third-party packages, and `npm` on the path
(it ships with Node). Unset `NODE_ENV` or leave it alone: the script clears it for children.

## Limits and decisions

- The checks read the built CSS and HTML; no browser renders the pages in this job. Computed
  colors in a real browser are covered by the Storybook visual snapshots, not here.
- Tailwind v4 has one theme namespace per app. The Credo `theme.css` defines `--color-*` roles,
  `--radius-*` and `--font-sans`/`--font-mono`; an app that defines the same names in its own `@theme`
  replaces or is replaced, whichever comes last. Decision 0005: documented, not namespaced; revisit
  only if collisions cause real problems.
  `vite-app` has a collision case under test: its `@theme`, declared after the Credo imports, defines
  `--radius-lg`, `--font-sans` and `--color-surface-container`. What the build shows: the app wins on
  those three keys. `rounded-lg` (which includes Button's large size), `font-sans` and
  `bg-surface-container` resolve to the app's values, not to `var(--cr-...)`. The `--cr-*` variables
  are unchanged, themed regions keep `--cr-font-family-sans`, and utilities on other keys
  (`rounded-md`, `bg-surface-page`, `bg-actions-primary-default`) still resolve to the token
  variables. With the Credo imports last, Credo would win instead. Colliding on a color role also
  detaches that utility from `data-theme` switching, because the app's value is a plain color.
- The nightly matrix (`releases-next.md`) crosses Node 22/24 and React 18/19 (`CONSUMER_REACT_MAJOR`,
  `vite-app` only on 18). Tailwind versions are not in it.
  Decision 0006 keeps this matrix (React 18 on the Vite consumer only; Next.js App Router only for now).
- `next-app` imports `@usecredo/icons` directly for the server entry, although the PRD table
  lists only `ui`, `tokens` and `tailwind-config` for consumers. Decision 0006: yes, `@usecredo/icons` is a public export and consumers may import it directly.
- There is no precompiled stylesheet: both consumers use Tailwind v4 (decisions 0005 and 0009).

## Owner steps (by hand)

1. Open a pull request so the `consumers` check appears once.
2. Settings, Rules, the protect-main ruleset, "Require status checks to pass": add
   `consumers`. Optionally also add it as a need of `ci-gate` later (it is a separate workflow,
   so it is not aggregated there).
3. The job has no path filter on purpose, so it is never left pending.
