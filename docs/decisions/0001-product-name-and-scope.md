# 0001 Product name and npm scope

Status: accepted (16 October 2026)

## Decision

- Product name: **Credo**. Trekant remains the parent company and owner organization;
  the maintainer contact is hatfim@trekant.dev.
- npm scope: **`@usecredo`**, for published and private packages alike
  (`@usecredo/tokens`, `@usecredo/tailwind-config`, `@usecredo/ui`, `@usecredo/icons`,
  `@usecredo/test-utils`, and so on).
- Repository: `git@github.com:hatfim/credo.git` (https://github.com/hatfim/credo).
  Licence stays MIT.

## Why

- `@opinionated` was dropped because the `opinionated` npm organization was unavailable.
- `@trekant` was dropped because the scope should carry the product name, not the
  parent company. This amends D-15 in the PRD, which named `@trekant`.
- `@usecredo` is the product scope.

## Still pending

- CSS variable prefix: `--cr-` is proposed and replaces the earlier `--ds-` proposal.
  It stays `TODO(decision: css-prefix)` until its own decision record is accepted.

## Owner actions

- Create the npm organization `usecredo` by hand, then require two-factor
  authentication for members (P0-02).
- Push the repository to `hatfim/credo`.
