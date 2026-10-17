# Releasing

Workflow: `.github/workflows/release.yml` (PRD 11.3 and 12.3, REL-04, DST-01). Scripts:
`scripts/release/` (tested with `pnpm test:release`, which `pnpm check` runs). The `next` channel
(`main.yml`) is separate and unchanged: see `releases-next.md`.

## How a release happens

1. Contributors add changesets in their pull requests (`pnpm changeset`).
2. On every push to `main`, job `release-pr` runs `changeset version` in the runner and force-pushes the
   result to the bot-owned branch `changeset-release/main`, then opens or updates the pull request
   "chore: version packages". It never pushes to `main`. The pull request is created with the secret
   `GH_PAT` (the one tokens-sync uses), because a pull request created with `GITHUB_TOKEN` does not start
   the required checks. The secret is read only in the two steps that push and open the pull request.
3. A maintainer reviews and merges that pull request like any other (required checks apply).
4. The merge is a push to `main`. `release-prepare` decides whether it is a release commit: no pending
   changesets, no prerelease mode, every published package at a plain `x.y.z` above `0.0.0`, and at least
   one version not yet on npm (read anonymously with `npm view`). A `-next-` or prerelease version makes
   the job fail instead of skipping. If it is a release commit it runs the full `pnpm check`, builds docs
   and Storybook from that commit, writes `build-info.json` (commit SHA and package versions) into each
   build, and verifies that both builds, the checked-out `HEAD` and the package versions agree.
5. `release-publish` publishes the four packages to `latest` with provenance, with `changeset publish
   --tag latest --no-git-tag`. It re-runs the release-commit check first.
6. `release-deploy` uploads the exact builds verified in step 4 to the two Vercel projects, then fetches
   `build-info.json` from the live sites (`DOCS_URL`, `STORYBOOK_URL`) and fails if either reports another
   commit (retrying for about two minutes while aliases update).

Publishing happens after the sites are built and verified, so a divergence stops the release before
anything is published. A failure after publish (a Vercel outage, say) leaves packages on npm: re-run the
failed `release-deploy` job; it uses the same prepared artifacts (kept 7 days).

## Switches and safety

| Variable (repository, Actions) | Default | Effect |
| --- | --- | --- |
| `RELEASE_PR` | unset (off) | `release-pr` opens and updates the release pull request |
| `PUBLISH_RELEASE` | unset (off) | `release-prepare`, `release-publish` and `release-deploy` run |

All four jobs run only on `push` to `refs/heads/main` of `hatfim/credo`. There is no `pull_request`
or tag trigger, so pull requests, forks and other refs run none of them (a fork's push runs in the fork,
without this repository's secrets or variables). Permissions are `contents: read`; only `release-publish`
also has `id-token: write`. Concurrency groups never cancel a running job. A queued run can be replaced
by a newer queued one; this is safe because the decision is derived from the repository and npm each time.
Third-party actions are pinned to full SHAs. No third-party release action is used.

## Owner steps (by hand; the workflow changes none of this)

1. npm: create the `@usecredo` organisation. Authentication is the same decision as for `next`
   (`TODO(decision: npm-publish-auth)`): a granular publish-only `NPM_TOKEN` secret, or trusted
   publishing. **Limit:** npm allows one trusted publisher (one workflow file) per package, and
   `releases-next.md` registers `main.yml`. Trusted publishing for both `main.yml` and `release.yml`
   therefore needs one of: keep `NPM_TOKEN` for now; move both publishes into one reusable workflow; or
   drop the `next` publish. This is not verified against npm and is left undecided.
2. Secret `GH_PAT` must exist and be allowed to push branches and open pull requests (contents and pull
   requests write). Then set the variable `RELEASE_PR` to `true`.
3. Vercel: create two projects (docs, Storybook) with stable URLs under one parent domain (REL-02). Create
   repository secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_DOCS`,
   `VERCEL_PROJECT_ID_STORYBOOK`, and variables `DOCS_URL` and `STORYBOOK_URL` (the production URLs, no
   trailing path). `TODO(decision: vercel-deploy-method)`: the release uploads prebuilt output with the
   Vercel CLI so the deployed bytes are the verified bytes. Vercel's own Git integration (used for
   previews, P1-25) must not also deploy `main` to production: turn off production deployments from Git in
   each project (or use an ignored build step), otherwise an unverified build can overwrite the release.
4. Decide the first stable release (see "The `latest` tag" in `releases-next.md`): the first `next`
   publish of a package also sets `latest` to the snapshot. Publish a deliberate first stable version, or
   fix the tag with `npm dist-tag`.
5. Set `PUBLISH_RELEASE` to `true`. Unset it to stop everything after the publish switch.

The release is also blocked until all Vercel secrets and both URL variables are present: the check runs
in `release-prepare`, before publishing, and never prints values.

## Tags and release notes

`TODO(decision: release-tags)`: `--no-git-tag`, so no git tags are created or pushed (that needs
`contents: write` on the publish job). The PRD also lists tags and release notes for the release; until
decided, the generated `CHANGELOG.md` files in each package are the release notes.

## Verify a release

- `npm view @usecredo/ui dist-tags` (all four): `latest` is the new version; the package page shows a
  provenance badge.
- `curl <DOCS_URL>/build-info.json` and `curl <STORYBOOK_URL>/build-info.json` both show the merge
  commit SHA and the published versions.
- The `release-deploy` job is green (it ran the same comparison).

## Dry run

Actions, Release, Run workflow (`dry-run` defaults to true; `false` is refused, real releases come only
from a push to `main`). Job `release-dry-run` runs `changeset version` in the runner, checks the lockfile
is still frozen-valid, builds and packs the four packages (tarball names, sizes and checksums go to the
step summary), builds docs and Storybook and runs the same-commit verification, and evaluates the
release guard. It has no secrets, no token, no push, no publish, no deploy.

The same steps run locally in a scratch clone (never in your working checkout, `changeset version`
edits files): `pnpm install --frozen-lockfile`, `pnpm exec changeset version`, build the four packages,
`node scripts/release/pack.mjs --out <dir>`, `node scripts/release/build-sites.mjs --sha $(git rev-parse HEAD)`,
`node scripts/release/release-state.mjs --offline`.

It proves: versioning applies cleanly, the lockfile stays valid, packages pack, both sites build and
carry the commit, the verification fails on a mismatch. It does not prove: npm authentication,
provenance, `changeset publish` against npmjs.org, the Vercel upload, the post-deploy check against
live URLs, or the `GH_PAT` pull request flow. Those run for the first time on the first real release.
