# 0009 Spike A, Tailwind delivery (P0-05)

Status: accepted (17 October 2026), decided by the owner

Markers closed: none by itself; it supports `precompiled-stylesheet` and `theme-namespace-collisions`
(decided in 0005).

## Context

P0-05 asked for a scratch Button consumed from three apps: Tailwind v4, no Tailwind with a precompiled
stylesheet, and one whose config already defines a `surface` colour. This was decided without a spike.

## Decision

Decided without a spike. The precompiled stylesheet fallback is dropped and Tailwind v4 is required
(0005).

## Evidence

- The real Button journey exists, and `consumers/vite-app` (own Tailwind config and CSS variables,
  P1-26) proves prefix coexistence only (DST-09; `consumers/vite-app/test/build.test.ts`).
- Not proven: the third scenario, a Tailwind config that already defines `surface`. `vite-app` defines
  background, primary, brand and `--radius` but no `surface`, and it avoids the colliding names
  (`--radius-*`, `--font-sans`); see `docs/contributing/consumers.md`. The namespace collision scenario
  is untested.
- The stylesheet scenario was never built, so build success, collision behaviour and cost of the
  fallback were not measured. The fallback was dropped on scope grounds.

## Consequences

- Revisit trigger: a second eligible project without Tailwind.
- Follow-up: PRD D-03 and spike A wording; P2-14 loses its stylesheet path (0005).
