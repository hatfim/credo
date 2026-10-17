# Preview deployments

REL-03: every pull request gets a preview of the docs site. Storybook is not hosted
(`docs/decisions/0003-storybook-not-hosted.md`), so there is no Storybook preview; reviewers run it
locally with `pnpm dev`. Previews come from Vercel's GitHub integration, not from a workflow: no token
or secret is stored in the repository. Production is different: only `release.yml` deploys to
production (`releasing.md`).

## What is in the repository

- `apps/docs/vercel.json`, read by Vercel from the project's Root Directory. It sets `framework: null`,
  `installCommand` (`cd ../.. && pnpm install --frozen-lockfile`), `buildCommand`
  (`cd ../.. && pnpm turbo run build --filter=@usecredo/docs...`), `outputDirectory` (`build`) and
  `git.deploymentEnabled: { "main": false }`.
- `git.deploymentEnabled.main = false` stops the Git integration from deploying `main`, so the release
  workflow stays the only production path. It only governs Git-triggered deployments; the release
  uses `vercel deploy --prebuilt --prod` from a staged directory
  (`.github/actions/deploy-sites/action.yml`), which carries no `vercel.json`, so the two do not
  conflict on configuration.
- No `ignoreCommand`: skipping builds is unsafe here because a change to a dependency (a package, the
  lockfile, tokens) changes the docs site. A test in `scripts/release/release.test.mjs` (run by
  `pnpm test:release` and `pnpm check`) keeps the config aligned with the build layout, fails if an
  `ignoreCommand` is added, and fails if a Storybook Vercel config appears.
- A separate `preview-build` GitHub job was considered and skipped: it would only repeat the `build`
  job (`turbo run build`), which already builds the docs site on every pull request.

## Owner steps, in order

1. In Vercel, create one project from `hatfim/credo` (for example `credo-docs`). Root Directory:
   `apps/docs`. Keep "Include source files outside of the Root Directory" enabled (the default),
   because the build runs from the repo root. Leave the framework preset, install, build and output
   fields alone: `vercel.json` sets them.
2. Project settings, General: Node.js Version 22.x. Vercel reads the Node version from the project
   setting, or from `engines.node` in the package.json of the Root Directory; `apps/docs/package.json`
   has no `engines`, and the repo-level `.nvmrc` is not read by Vercel.
3. Environment variable `ENABLE_EXPERIMENTAL_COREPACK=1`, so Vercel uses the root `packageManager`
   (pnpm 10.17.1) instead of choosing a pnpm version from the lockfile.
4. Connect the GitHub repository (this installs the Vercel GitHub app) so Vercel comments the preview
   link on each pull request.
5. Optional environment variables, scope Preview: `DOCS_URL` (the production docs origin, used for
   canonical URLs) and `DOCS_BASE_URL` if the docs are served below a path. Without them the build uses
   the `https://credo.trekant.dev` default (decision 0006) and `/`, which does not break the build.
6. Project settings, Git: confirm production deploys from `main` are off. `vercel.json` already
   disables them. Do not set an Ignored Build Step. After a merge, check that Vercel made no
   Git-triggered production deployment.
7. Optional: Deployment Protection (Vercel Authentication) for previews, if pull requests may contain
   unreleased design work. Reviewers then need a Vercel login.
8. Do not add the Vercel project as a required status check until you have seen it pass once.
9. Before the first real release, run the release dry run (`releasing.md`) and, once a production
   deploy has been made, check the prebuilt deploy with the Root Directory set (see below).

## Pull requests from forks

Vercel does not build a fork's pull request until a member of the Vercel team authorizes the
deployment, and Preview environment variables and secrets are not exposed to such builds. The docs
build needs none to succeed (the variables above are optional), so an authorized fork preview builds
with the placeholders.

## Cross-links

Storybook is not hosted, so the docs site does not link to it. The Button page names stories by ID in
inline code and tells readers to run `pnpm dev` and open `http://localhost:6006`. `check:stories`
still fails if a referenced ID is missing from the Storybook index. No build reads a Storybook URL.

## How to verify

Open a test pull request. Within a few minutes Vercel comments on it with the preview link, and the
checks list shows a Vercel entry. Open the link and browse the Button page.

## Not verified here

Everything that needs Vercel or GitHub: that the preview link appears, that the `cd ../..` commands
work in Vercel's build image, that pnpm 10 and Node 22 are selected, that Vercel accepts
`git.deploymentEnabled` with a branch map, and that the CLI prebuilt production deploy still works
once Root Directory is set on the project. For that last item, if the first release deploy fails with
a message that a path such as `apps/docs` does not exist, the CLI is applying the project's Root
Directory to the staged directory; the fix then belongs in `deploy-sites` (stage under the root
directory). Locally the same install and build commands were run in a scratch clone.
