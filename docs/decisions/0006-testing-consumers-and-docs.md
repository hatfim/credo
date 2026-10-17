# 0006 Testing, consumers and docs

Status: accepted (17 October 2026), decided by the owner

Markers closed: `snapshot-setup`, `consumer-version-matrix`, `icons-direct-use`, `docs-url`,
`docs-framework`.

## Context

The visual test setup, the consumer matrix, icon exports, the docs host and the docs framework were
carried as conservative defaults. They are now running in the repository and can be confirmed.

## Decision

- **snapshot-setup:** keep Playwright on the built Storybook. Any diff fails. Baselines change only
  through CI approval.
- **consumer-version-matrix:** keep Node 22 and 24 with React 18 and 19 (React 18 on the Vite consumer
  only). Next.js: App Router only for now; Pages Router only if a real consumer needs it. The Next.js
  and pure React requirement is PRD DST-11.
- **icons-direct-use:** yes. `@usecredo/icons` is a public export since it is published. Components
  should still re-export the icons they use.
- **docs-url:** `https://credo.trekant.dev` everywhere.
- **docs-framework:** Docusaurus is final. Spike B is recorded as "already builds, accepted" (0010),
  with a one-line fallback note: Astro Starlight.

## Consequences

Follow-up, not done in this record:

- PRD: name `@usecredo/icons` as a public export.
- Code: replace the placeholder docs host with `https://credo.trekant.dev` everywhere.
- Replace the five markers with references to this record.

## Still pending

None of the markers listed here remain open.
