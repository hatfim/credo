# 0002 Token file format and semantic role taxonomy

Status: accepted (17 October 2026)

## Decision

- **Token file format: W3C DTCG.** Tokens Studio writes `packages/tokens/generated/tokens.json`
  with `$value` and `$type` (single file, free plan, no Themes feature). This closes the
  "token file format" item in CLAUDE.md.
- **Sync branch: `tokens-sync`. File: `packages/tokens/generated/tokens.json`.**
- **Sets:** `Primitives/Default`, `Brand/Default` (scales 50 to 1200), `Semantic/Light`,
  `Semantic/Dark`, `Typography/Desktop`, `Typography/Mobile`. A second reference theme
  is added as further sets (P2-10).
- **Semantic contract:** the file's own role taxonomy (`surface`, `content`, `field`,
  `actions`, `state`, `border`, `feedback`, `alpha`, `shadow`), identical names in light
  and dark. shadcn/ui is a reference for component patterns only: no shadcn role names,
  no aliases. `tailwind-config` exposes the roles directly.
- **Literals:** raw hex values are allowed only in `alpha.*` and `shadow.color.*`. Each
  `alpha.*` literal's RGB must equal the scale step the contract names for it.

## Why

- DTCG is what the plugin already writes for this file, and the format is a plugin setting
  chosen once (PRD 6.6, TOK-14).
- The previous file mixed two role vocabularies. The cleanup is described in
  `docs/token-review.md`.

## Still pending

- CSS variable prefix: `--cr-` stays `TODO(decision: css-prefix)`.

## Supersedes

PRD 6.1 wording "superset of the roles shadcn/ui uses" (already amended).
