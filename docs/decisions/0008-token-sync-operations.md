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
- **tokens-sync-tooling-source:** automate with a workflow on `main` that merges `main` into
  `tokens-sync`, with these rules:
  - On a conflict in `packages/tokens/generated/`, keep the `tokens-sync` side.
  - On any other conflict, stop and push nothing. Post a comment listing the conflicting files on the
    open `tokens-sync` pull request if one exists (REST, same marker approach as the diff comment, no
    new permission). Always fail the run (default email).
  - No issue creation: it would need Issues read/write on the token. Add later if wanted.
  - The workflow must never edit the generated file itself.

## Consequences

Follow-up, not done in this record:

- Write the merge workflow on `main` and replace the two markers with references to this record.
- Owner: rotate `GH_PAT` before 14 January 2027.

## Still pending

None of the markers listed here remain open.
