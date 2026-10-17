# 0005 Styling, tokens and fonts

Status: accepted (17 October 2026), decided by the owner

Markers closed: `precompiled-stylesheet`, `tailwind-minimum`, `theme-namespace-collisions`,
`token-usage-notes`, `second-theme`, `fonts`, `typography-breakpoint`.

## Context

PRD D-03 kept a precompiled stylesheet as a fallback for consumers without Tailwind, subject to spike A.
Several smaller styling and token questions were left as markers. The first Button journey, the
coexistence consumer and the docs site now exist, so these can be settled.

## Decision

- **precompiled-stylesheet:** dropped for the MVP. Tailwind v4 is a requirement. Revisit trigger: a
  second eligible project without Tailwind. Known limit: a pure React app without Tailwind cannot use
  Credo (PRD DST-11 and 13.4 already list it as uncovered).
- **tailwind-minimum:** the tested 4.3.x. The docs state that older v4 versions are unsupported until
  tested.
- **typography breakpoint:** 768px. Mobile typography below it, desktop typography at 768px and above.
- **theme-namespace-collisions:** document for now. The coexistence consumer (P1-26) keeps a collision
  case under test. Namespace later only if collisions cause real problems.
- **token-usage-notes:** deferred. Per-token usage notes can go into token `$description` fields later.
- **second-theme:** deferred; no second brand is planned. The swap can be proved cheaply in a test
  fixture: the validator swaps `scale.primary` to the indigo palette and checks contrast, with no design
  work. Caveat: `actions.primary.foreground` is currently hard-wired to the dark ink, so a future dark
  brand colour would need that role overridden.
- **fonts:**
  - Sans and body font: Lexend (`font-family.sans`, fallback `ui-sans-serif, system-ui, sans-serif`).
  - Mono font: Geist Mono, replacing Illinois Mono. The owner edits `font-family.mono` in Figma and
    pushes it; `tokens.json` is never hand-edited. No serif.
  - Delivery: the docs site and Storybook self-host the fonts from open-source font packages (check size
    and licence before adding; Fontsource-style packages are the expected route). Published Credo
    packages ship no font files and only name the fonts with a system fallback stack. Consumers choose
    how to load them, and the docs show both ways: self-hosted files and the Google Fonts `<link>`
    (Next.js can use `next/font/google`).
  - Visual baselines are regenerated once with the real fonts.
  - The owner first chose Google Fonts, then changed to self-hosted. Reasons: deterministic visual
    tests, and no third-party host, CSP or privacy surface for Credo's own sites.

## Consequences

Follow-up, not done in this record:

- PRD D-03 and spike A wording (see 0009) say the stylesheet is dropped; PRD section 5 stack row and the
  DST-09 wording follow. Task P2-14 loses its stylesheet path.
- No collision case is under test today. Add one to `consumers/vite-app` (for example the app defines
  `--radius-md`, `--font-sans` or a `surface` colour) and assert what wins; until then the decision's
  "keeps testing" is a to-do, not a fact.
- Add the Tailwind 4.3.x minimum to the install docs and the peer or engines documentation.
- Add a PRD note on P2-10: second theme deferred, no second brand planned; drop it from the MVP gate.
  Add the fixture test (validator swaps `scale.primary` to indigo and checks contrast). CLAUDE.md's
  definition of done mentions the "second reference theme" and needs rewording.
- Fonts: owner pushes `font-family.mono` = Geist Mono from Figma; add font packages to `apps/docs` and
  `apps/storybook` after checking size and licence; document both consumer loading routes; regenerate
  visual baselines once.
- Replace the seven markers with references to this record.

## Still pending

None of the markers listed here remain open.
