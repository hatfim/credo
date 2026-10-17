# 0011 Spike C, Playwright snapshots (P0-07)

Status: accepted (17 October 2026), decided by the owner

Markers closed: none by itself; it supports `snapshot-setup` (decided in 0006).

## Context

P0-07 asked for three stories in two themes, screenshotted in GitHub Actions: three unchanged runs give
zero diffs, a deliberate change uploads diff images, and one baseline set size is noted. This was
decided without a spike.

## Decision

Decided without a spike. Playwright snapshots run on the built Storybook (0006).

## Evidence

- Snapshots run in CI on the built Storybook.
- Deterministic: two regenerations were byte-identical, per the reviewer. This is two runs, not the
  three the task asked for.
- Diff images are uploaded as an artifact on failure.
- Baseline set size: 10 PNGs, about 45 KB (45,858 bytes; 64 KB on disk).
- The set is five stories in two themes (more than the three the task asked for).
- Not performed: the deliberate-change run and the three-run determinism check the task specified. Baselines will be
  regenerated once with the real fonts (0005).
