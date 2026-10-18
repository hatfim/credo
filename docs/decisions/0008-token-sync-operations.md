# 0008 Token sync operations

Status: accepted (17 October 2026), decided by the owner

Markers closed: `token-sync-pr-token`, `tokens-sync-tooling-source`.

## Context

Tokens Studio pushes `packages/tokens/generated/tokens.json` to `tokens-sync` (see 0002). A workflow
opens the pull request into `main`, which needs a token, and `tokens-sync` needs the tooling that lives
on `main`.

## Decision

- **token-sync-pr-token:** keep the owner's personal fine-grained token `GH_PAT` (Contents and Pull
  requests read/write). Rotate it before it expires on 14 January 2027; owner reminder on 1 January.
- **tokens-sync-tooling-source:** keep merging `main` into `tokens-sync` by hand (owner, revised
  17 October 2026). The owner first chose a workflow on `main` that merges automatically, with rules for
  conflicts. On review it turned out that workflow cannot work with the current token: a push that
  changes `.github/workflows/*` needs the **Workflows: Read and write** permission, which neither the
  owner's `GH_PAT` (Contents and Pull requests) nor the default `GITHUB_TOKEN` has, and merging `main`
  into `tokens-sync` routinely brings workflow changes. Adding that permission would let the token change
  workflow files on any branch it can write to, which is a wider token than the owner wants for a merge
  that is rarely needed. The merge stays manual: do it once before the first run and again after any
  merge to `main` that changes the token sync workflow, the setup action or the `diff` command. If the
  tooling is missing, the first step of the sync workflow fails with a message that says so.
  - Revisit trigger: the manual merge starts to be forgotten or happens often, or a GitHub App or
    machine user with scoped permissions is set up. The first design (conflicts in
    `packages/tokens/generated/` keep the `tokens-sync` side, any other conflict stops and comments on
    the open `tokens-sync` pull request, no issue creation, never edit the generated file) is the
    starting point for that workflow.

## Consequences

- No merge workflow is written. The token sync documentation describes the manual merge as the
  standing procedure, not an interim.
- The marker `tokens-sync-tooling-source` is settled by this record.
- Owner: rotate `GH_PAT` before 14 January 2027.

## Still pending

None of the markers listed here remain open.
