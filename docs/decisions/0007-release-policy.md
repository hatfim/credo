# 0007 Release policy

Status: accepted (17 October 2026), decided by the owner

Markers closed: `npm-publish-auth`, `release-tags`, `first-release`, `vercel-deploy-method`,
`nightly-failure-alerts`.

## Context

The first publish happened on 2026-10-17 with a granular npm token: `next` snapshots
`0.0.0-next-20261017074904` on all four packages, provenance present. `latest` still points at
that first snapshot on all four packages. The owner also published `0.0.0-stage` placeholder versions.
`next` moves with each push to `main`, so `npm view` now shows a later `next` than the first snapshot.

## Decision

- **npm-publish-auth:** after the first publish, move all four packages to trusted publishing and
  delete `NPM_TOKEN`. The owner does this by hand.
- **versions / first-release:** `0.1.0` after the Phase 2 pilot gate and `1.0.0` at the Phase 3 gate.
  Until then publish snapshots under `next` only. If `latest` points at a snapshot, the owner resets it
  with `npm dist-tag`.
- **release-tags:** yes, git tags and GitHub releases, but only from the first stable release.
- **vercel-deploy-method:** keep the CLI (prebuilt) production deploy until the first dry run settles
  the Root Directory case. Previews use the Vercel Git integration, with production Git deploys of
  `main` disabled.
- **nightly-failure-alerts:** default GitHub email only; no issue creation.

## Consequences

Follow-up, not done in this record:

- Owner: reset `latest` on the four packages with `npm dist-tag` (it currently points at the snapshot),
  move to trusted publishing, delete `NPM_TOKEN`.
- Release workflow creates tags and GitHub releases only for stable versions.
- Replace the five markers with references to this record.

## Still pending

None of the markers listed here remain open.
