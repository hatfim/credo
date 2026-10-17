# Preview deployments

REL-03: every pull request gets a preview of the docs site and of Storybook. Previews come from
Vercel's GitHub integration, not from a workflow: no token or secret is involved, and pull requests
from forks work because nothing in the repository's secrets is exposed. Production is different:
only `release.yml` deploys to production (`releasing.md`).

## What is in the repository

- `apps/docs/vercel.json` and `apps/storybook/vercel.json`, one per project. Vercel reads the file in
  the project's Root Directory, so two projects need two files (a root-level file would be shared).
  Each sets `framework: null`, `installCommand` (`cd ../.. && pnpm install --frozen-lockfile`),
  `buildCommand` (`cd ../.. && pnpm turbo run build --filter=<package>...`), `outputDirectory`
  (`build` for docs, `storybook-static` for Storybook) and
  `git.deploymentEnabled: { "main": false }`.
- `git.deploymentEnabled.main = false` stops the Git integration from deploying `main`, so the release
  workflow stays the only production path. It only governs Git-triggered deployments; the release
  uses `vercel deploy --prebuilt --prod` from a staged directory
  (`.github/actions/deploy-sites/action.yml`), which carries no `vercel.json`, so the two do not
  conflict on configuration.
- No `ignoreCommand`: skipping builds is unsafe here because a change to a dependency (a package, the
  lockfile, tokens) changes both sites. A test in `scripts/release/release.test.mjs` (run by
  `pnpm test:release` and `pnpm check`) keeps the configs aligned with the build layout and fails if an
  `ignoreCommand` is added.
- A separate `preview-build` GitHub job was considered and skipped: it would only repeat the `build`
  job (`turbo run build`), which already builds both sites on every pull request.

## Owner steps, in order

1. In Vercel, create two projects from `hatfim/credo`: `credo-docs` and `credo-storybook`
   (names are free). Root Directory: `apps/docs` and `apps/storybook`. Keep "Include source files
   outside of the Root Directory" enabled (the default), because the build runs from the repo root.
   Leave the framework preset, install, build and output fields alone: `vercel.json` sets them.
2. Project settings, General: Node.js Version 22.x. Vercel reads the Node version from the project
   setting, or from `engines.node` in the package.json of the Root Directory; the app package.json files
   have no `engines`, and the repo-level `.nvmrc` is not read by Vercel.
3. Environment variable `ENABLE_EXPERIMENTAL_COREPACK=1` on both projects, so Vercel uses the root
   `packageManager` (pnpm 10.17.1) instead of choosing a pnpm version from the lockfile.
4. Install the Vercel GitHub app for the repository (the project connection does this) so Vercel
   comments the preview links on each pull request.
5. Environment variables, scope Preview (and Production if you want a manual dashboard build to
   work; the release workflow takes its URLs from the repository variables):
   - Docs project: `STORYBOOK_URL` = the production Storybook origin, `DOCS_URL` = the production docs
     origin, `DOCS_BASE_URL` only if the docs are served below a path.
   - Storybook project: none required (Storybook does not read `DOCS_URL`).
6. Project settings, Git: confirm production deploys from `main` are off. `vercel.json` already
   disables them. Do not set an Ignored Build Step. After a merge, check that Vercel made no
   Git-triggered production deployment.
7. Optional: Deployment Protection (Vercel Authentication) for previews, if pull requests may contain
   unreleased design work. Reviewers then need a Vercel login.
8. Do not add the Vercel projects as required status checks until you have seen them pass once.

## Cross-links inside previews

`TODO(decision: preview-cross-links)`. The docs build reads `STORYBOOK_URL` (story links) and
`DOCS_URL`/`DOCS_BASE_URL` (canonical URL); Storybook reads neither. A preview cannot know the other
site's preview URL at build time, because `VERCEL_URL` and `VERCEL_BRANCH_URL` belong to the project
being built. So previews are not wired to each other. Docs previews link to whatever `STORYBOOK_URL`
holds, which is the production Storybook per step 5, or the `https://storybook.example.invalid`
placeholder when unset. Neither breaks the build: `onBrokenLinks` and `check:links` do not fetch
external URLs. `STORYBOOK_URL` was also added to the Turborepo `build` task `env` so a changed value
invalidates the cached docs build.

## How to verify

Open a test pull request. Within a few minutes Vercel comments on it with two deployments (docs and
Storybook), each with a preview link, and the checks list shows two Vercel entries. Open both links;
in the docs preview, open a component page and follow its Storybook link.

## Not verified here

Everything that needs Vercel or GitHub: that the preview links appear, that the `cd ../..` commands
work in Vercel's build image, that pnpm 10 and Node 22 are selected, that Vercel accepts
`git.deploymentEnabled` with a branch map, and that the CLI prebuilt production deploy still works
once Root Directory is set on the project. For that last item, if the first release deploy fails with
a message that a path such as `apps/docs` does not exist, the CLI is applying the project's Root
Directory to the staged directory; the fix then belongs in `deploy-sites` (stage under the root
directory) and is an owner and release-engineer follow-up. Locally the same install and build
commands were run in a scratch clone (see the P1-25 report).
