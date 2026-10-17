# Pull request CI

Workflow: `.github/workflows/pull-request.yml`, on every pull request into `main`
(BLD-08, TST-02). Shared setup (pnpm from `packageManager`, Node from `.nvmrc`,
frozen-lockfile install, Turborepo cache) is `.github/actions/setup`. Turborepo runs
with `--affected` against the base branch, so unrelated packages are skipped.

## Jobs and check names

| Check name | Runs |
| --- | --- |
| `lint` | `syncpack lint`, `turbo run lint --affected` (includes import boundaries) |
| `typecheck` | `turbo run typecheck --affected` |
| `test` | `turbo run test --affected` |
| `build` | `turbo run build --affected` (both apps included) |
| `docs-links` | `turbo run check:links check:stories --affected` |
| `storybook` | `turbo run test:storybook --affected` (smoke and accessibility) |
| `ci-gate` | Needs all of the above; fails if any failed, was cancelled or was skipped |

The ruleset matches the bare job name (for example `ci-gate`). GitHub shows it as
`Pull request / <name>` in the checks list. Later workflows must not reuse these names.

## Owner steps (by hand)

1. Open a pull request so the workflow runs once and the check names become selectable.
2. Settings, Rules, the protect-main ruleset, "Require status checks to pass": add
   `ci-gate` (minimum), and preferably also `lint`, `typecheck`, `test`, `build`,
   `docs-links`, `storybook`. Leave the app filter on "any source" or GitHub Actions.
3. Enable "Require branches to be up to date" if wanted.
4. Do not rely on path filters to skip these jobs: a skipped required check stays
   pending. The jobs always run; Turborepo decides what is affected.

A failing check blocks merge only once step 2 is done; the repository settings are not
changed by the workflow.

## Not yet in this workflow

Visual snapshots live in their own workflow (`visual.yml`, see `visual-testing.md`). Consumer integration lives in `consumers.yml` (see `consumers.md`). Main and nightly workflows, and the `next` channel, are in `releases-next.md`. The release workflow (version pull request, publish to `latest`, same-commit docs and Storybook deploy) is in `releasing.md`. The changeset check and preview
deployments (PRD 11.3) belong to later tasks.
