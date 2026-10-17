# 0010 Spike B, Docusaurus (P0-06)

Status: accepted (17 October 2026), decided by the owner

Markers closed: none by itself; it supports `docs-framework` (decided in 0006).

## Context

P0-06 required five conditions in a scratch site. This was decided without a spike: `apps/docs` already
builds with Docusaurus, so it is accepted.

## Decision

Decided without a spike. Docusaurus is final. Fallback, if it ever fails: Astro Starlight.

## Evidence against the five conditions

| Condition | State |
| --- | --- |
| Live component in the default theme | Proven: the docs site renders the live Button from `@usecredo/ui`. |
| Live component in a second theme | Not proven; the second theme is deferred (0005). |
| Builds with Tailwind v4 without style leakage | Proven in the repository by the `@layer infima` isolation of Docusaurus base styles. |
| Searches offline in CI | Search works in the docs build. Offline operation in CI was not checked separately for this record. |
| Versioned snapshot | Not proven; deferred. Versioned docs are required from 1.0 (PRD, D-10). |
| Broken link fails the build | Proven: the link check fails the build on a broken link. |

Evidence is from the current repository state as reported to the owner; this record did not re-run the
docs build.
