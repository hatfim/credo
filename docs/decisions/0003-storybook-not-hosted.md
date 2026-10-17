# 0003 Storybook is not hosted

Status: accepted (17 October 2026), owner decision

## Context

The PRD (D-06, REL-02 to REL-05, DOC-05) assumed two hosted sites, docs and Storybook, each with
per-PR previews and a same-commit deployment. Storybook is a development and verification tool here:
it renders the real components for smoke, accessibility and visual checks. Hosting it adds a second
Vercel project, a second set of secrets and URLs, and cross-site links that are hard to keep valid in
previews.

## Decision

- Storybook is not hosted. It runs in development with `pnpm dev` (port 6006) and is built in CI for
  the smoke, accessibility and visual checks (`test:storybook`, `visual`, `check:stories`).
- Only the docs site is deployed: previews through Vercel's GitHub integration, production through the
  release workflow.
- Docs pages name stories by ID in plain text; Storybook stories still link back to their docs page.

## Consequences

- Deleted: `apps/storybook/vercel.json`, the Storybook artifacts and deploy in `release.yml` and
  `deploy-sites`, the `VERCEL_PROJECT_ID_STORYBOOK` secret and `STORYBOOK_URL` variable, the
  `--storybook` option of `same-commit.mjs`, and the generated `storybook.json` in the docs build.
- `check:stories` is unchanged in what it rejects (missing index, unknown referenced story ID,
  stable component without docs or stories, stories not linking back); it reads story IDs from inline
  code instead of URLs.
- PRD text amended with a "see decision 0003" note: sections 1 (hosting), D-06, 6 (docs and Storybook
  links), the repository layout, 9.4, DOC-05, 11.3 (pipeline table and hosting sentence), 12 (intro,
  12.1, 12.2, 12.3), REL-02 to REL-05. Requirement IDs are kept.
- Task notes added to P0-03, P1-18, P1-19, P1-24, P1-25, P3-02 and P3-08. P3-02's Storybook
  deployment and the Storybook half of P3-08 no longer apply.

## Revisit if hosting is wanted later

Add a second Vercel project (root directory `apps/storybook`) with its own `vercel.json`, restore the
Storybook artifact, secret and URL in the release workflow, restore the `--storybook` check in
`same-commit.mjs`, and decide how docs link to a hosted Storybook (and how previews find each other).
Versioned Storybook snapshots (REL-05) would then apply again.
