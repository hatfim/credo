# 0004 Packaging and build conventions

Status: accepted (17 October 2026), decided by the owner

Markers closed: `css-prefix`, `build-tool`, `radix-packaging`, `use-client-scope`.

## Context

CLAUDE.md and the PRD carried four conservative defaults as `TODO(decision: ...)` markers: the CSS
variable prefix, the library build tool, how Radix is packaged, and where `use client` is placed.
The first publish of the four packages already happened on 2026-10-17 with these defaults.

## Decision

- **css-prefix:** keep `--cr-`. It is accepted and no longer a proposal (it replaces `--ds-`, see 0001).
- **build-tool:** keep tsup.
- **radix-packaging:** keep the scoped `@radix-ui/react-*` packages, not the unified `radix-ui`
  package. Reason: it keeps bundles per component and matches the per-component subpath exports.
- **use-client-scope:** add `use client` per entry point.

## Consequences

Follow-up, not done in this record:

- Replace the four `TODO(decision: ...)` markers in code, CLAUDE.md ("Decisions still pending") and the
  PRD with references to this record.
- 0001 and 0002 say `--cr-` stays pending; this record settles it.

## Still pending

None of the markers listed here remain open.
