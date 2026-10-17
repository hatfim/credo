# Visual testing and baseline approval

Workflows: `.github/workflows/visual.yml` (check `visual`) and
`.github/workflows/visual-update.yml` (manual). Code: `apps/storybook/playwright.config.ts`
and `apps/storybook/visual/` (SBK-04, TST-06, D-07).

`TODO(decision: snapshot-setup)`: spike C (P0-07) has not run. This is the conservative setup from
D-07: self-hosted Playwright snapshots against the built Storybook, Chromium only, baselines
committed in the repository, generated on Linux CI only. Revisit when the spike lands or if reviewing
diffs becomes a burden (D-07 allows a hosted service).

## What is covered

`visual/stories.spec.ts` lists a small set of story ids (Button default, variants, sizes, disabled,
loading), each in light and dark (`globals=theme:...`). A listed id missing from the built
`index.json` fails the run. Determinism: fixed 800x600 viewport, device scale 1, reduced motion,
animations disabled, caret hidden, UTC, `en-US`, fonts awaited, no retries. The second reference
theme is added when it has tokens. Extend the list as components reach stable.

Baselines are PNG files in `apps/storybook/visual/__snapshots__/`, one per story and theme, with no
platform suffix because only the Linux CI runner produces them.

## Review and approval

1. Open a pull request. The `visual` check builds Storybook and compares each story to its baseline.
2. No diff: the check passes.
3. Diff: the check fails and uploads the artifact `visual-diff` (14 days). In it,
   `test-results/visual/<test>/` holds three images per failing story: `*-expected.png` (baseline),
   `*-actual.png` (this pull request) and `*-diff.png` (changed pixels in red). Open
   `playwright-report/index.html` for a side-by-side slider view.
4. The author checks the diff is intended. A token change legitimately produces diffs; a
   component change should only change what it meant to.
5. The design representative reviews the images and approves (PRD 10.1: explicit approval before
   baselines update). Approval is a review comment on the pull request plus the baseline commit below.
6. Baselines are updated, the check turns green, the pull request merges.

## Updating baselines (CI only)

Baselines change only through CI. Never run with `--update-snapshots` or `-u` locally: the config
refuses it unless `CI` is set, and a local macOS render would not match the Linux runner anyway.

1. Actions, "Update visual baselines", Run workflow, choose the pull request branch. (Or
   `gh workflow run visual-update.yml --ref <branch>`.) The workflow only becomes selectable once
   it exists on `main`.
2. When it finishes, download the artifact `visual-baselines`.
3. Replace `apps/storybook/visual/__snapshots__/*.png` with its contents, commit, push to the pull
   request branch.
4. The `visual` check re-runs against the new baselines. The reviewer sees the PNG changes in the diff.

The update job does not push. Pushing needs a write token reachable from a workflow, which is a
larger attack surface than one manual download step; revisit if the manual step becomes a burden.

## First baselines (owner, once)

No baselines exist yet, because none can be produced off Linux. Until they do, `pnpm test:visual`
and the `visual` check fail with "No visual baselines ... Run the 'Update visual baselines'
workflow". The owner:

1. Merges the workflows (with `visual` not yet required).
2. Runs "Update visual baselines" on `main`, downloads `visual-baselines`, commits the PNGs through a
   pull request. Review them by eye: they are the reference from then on.
3. Then adds `visual` as a required status check: Settings, Rules, the protect-main ruleset,
   "Require status checks to pass", add `visual`. The workflow has no path filters, so it always reports.

## Running locally

```text
pnpm --filter @usecredo/storybook build
pnpm --filter @usecredo/storybook exec playwright install chromium   # once
pnpm test:visual
```

Local runs only compare; they never write baselines. Rendering on macOS or Windows differs from
Linux (font rasterisation), so a local failure may not be real. Treat CI as the source of truth.
`test:visual` is not part of `pnpm check`: it needs a downloaded browser and Linux baselines. It has its own Turborepo
task (`test:visual`, uncached) and is run by CI.
