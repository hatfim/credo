# Credo Design System — Task list by phase

16 October 2026 · Hatfim

## Next step: code in the CLI

Finish the manual setup tasks P0-01 to P0-04 first (GitHub, npm, Vercel, Figma), then start code in the CLI at P1-01. Phases 1 and 2 are almost all code. Every task has an acceptance check and a reference to the PRD requirement it satisfies, so a CLI session can verify its own work.

1. Create the repository with branch protection (P0-01).
2. Put the PRD in the repository as `docs/prd.md` (export the PRD doc as Markdown) and this list as `docs/tasks.md`, so every CLI session has the same context.
3. Add the `CLAUDE.md` below at the repository root.
4. Run the starter prompt, which covers P1-01 to P1-05 (the repository skeleton). Review the result, then continue with the next workstream.

```markdown
# Credo Design System

Source of truth: docs/prd.md and docs/tasks.md. Follow them and do not invent scope.

## Stack
pnpm workspaces, Turborepo, React and TypeScript (strict), Radix UI, Tailwind CSS v4,
Storybook, Docusaurus, Vitest, Playwright, Changesets. Node 22, pnpm pinned through
the packageManager field. Public npm scope @usecredo, MIT licence. Repository git@github.com:hatfim/credo.git.

## Packages
Published: @usecredo/tokens, @usecredo/tailwind-config, @usecredo/ui, @usecredo/icons.
Private: test-utils, typescript-config, eslint-config, apps/docs, apps/storybook.
consumers/* simulate external apps and install packed tarballs only.

## Rules
- Apps depend on packages, never the reverse. No component code lives in apps/.
- Components read only semantic or component tokens. CSS variables carry one
  organization prefix (--cr-, accepted in decision 0004).
- Never edit generated token output. Tokens come from the Tokens Studio sync file.
- No direct pushes to main. Changes to a published package need a changeset.
- Pin every third-party GitHub Action to a version or commit SHA.
- A stable component needs stories, tests, a docs page, and keyboard and
  accessibility checks (PRD section 7.3).

## Commands
pnpm dev, pnpm build, pnpm lint, pnpm typecheck, pnpm test, pnpm check
```

```text
Read CLAUDE.md, docs/prd.md and docs/tasks.md. Do tasks P1-01 to P1-05 only, in
order, and check each one against its acceptance line. Commit each task
separately on a feature branch. Stop after P1-05 and report what you did, what
you could not verify, and any decision you needed that the PRD does not make.
```

## Phase 0: decisions and baseline

Phase 0 sets up the accounts, runs three spikes, records the decisions and measures the starting point. It closes at gate 0: decision records signed and baselines recorded (PRD 15.3).

### Setup (manual)

- [ ] **P0-01 GitHub repository.** Create the public repository hatfim/credo (git@github.com:hatfim/credo.git) with an MIT LICENSE and a README as the first commit (Tokens Studio needs a non-empty repository). Protect `main`: pull request required, no direct pushes, no force pushes, no bypass for admins. Add CODEOWNERS naming hatfim. *Accept:* a direct push to `main` is rejected, including for the owner. (7.4, TOK-13)
- [ ] **P0-02 npm organization.** Create the `usecredo` organization (scope `@usecredo`), then require two-factor authentication for members, and choose how CI publishes (trusted publishing from GitHub Actions, or a granular automation token kept as a secret). *Accept:* two-factor is required in the organization settings and the publishing method is written down. (D-15, 8.2)
- [ ] **P0-03 Vercel.** Connect the GitHub repository and create two projects, one for the docs site and one for Storybook, with root directories `apps/docs` and `apps/storybook`. Set up one subdomain for each and enable pull request previews. *Accept:* both projects exist and each serves a placeholder page on its subdomain. (D-06, REL-02, REL-03) *Amended by decision 0003 (Storybook is not hosted): one Vercel project (docs) only; ignore the Storybook project.*
- [ ] **P0-04 Figma and Tokens Studio.** Create the Figma token file, install the Tokens Studio plugin, create the `tokens-sync` branch, create a fine-grained token limited to this repository (contents and pull requests, read and write), and save it as the `GH_PAT` repository secret. Point the plugin's GitHub sync at `packages/tokens/generated/tokens.json`. *Accept:* pushing from the plugin creates a commit on `tokens-sync`. (TOK-11, 6.6)

### Spikes (throwaway branches, results go into decision records)

- [ ] **P0-05 Spike A, Tailwind delivery.** Build one Button with Tailwind v4 classes in a scratch package. Consume it from three apps: one with Tailwind v4, one without Tailwind that uses a precompiled stylesheet, and one whose Tailwind config already defines a `surface` color. *Accept:* a written result says whether the fallback stylesheet builds, whether it avoids class and variable collisions, what it costs, and whether to keep it. (D-03, DST-09, 6.2) *Amended by decisions 0005 and 0009: decided without a spike; the precompiled stylesheet is dropped and Tailwind v4 is required. The `surface` collision scenario is untested and becomes a follow-up below.*
- [ ] **P0-06 Spike B, Docusaurus.** *Accept:* all five hold in a scratch site: it renders a live component in the default and a second theme, builds with Tailwind v4 without style leakage, searches offline in CI, creates a versioned snapshot, and fails the build on a broken link. If one fails, try Astro Starlight and record why. (D-05, 9.1) *Amended by decision 0010: decided without a spike (Docusaurus already builds); Astro Starlight stays the fallback. The second theme is deferred (0005), so the live component is shown in light and dark.*
- [ ] **P0-07 Spike C, Playwright snapshots.** Build a Storybook with three stories in two themes and take screenshots in GitHub Actions. *Accept:* three unchanged runs give zero diffs, a deliberate change uploads diff images as a workflow artifact, and the size of one baseline set is noted. (D-07, 10) *Amended by decisions 0006 and 0011: decided without a spike; Playwright snapshots on the built Storybook are kept, any diff fails, and baselines change only through CI approval.*

### Baselines

- [ ] **P0-08 Eligible projects.** List the projects you declare eligible in `docs/adoption/eligible-projects.md`, with framework, React version and whether each uses Tailwind. *Accept:* the file is committed. (D-13, 14)
- [ ] **P0-09 Metric baselines.** For each eligible project record the number of duplicated components, an accessibility check on a few sample screens, and the time it took to set up UI foundations in a recent project. Run the first developer survey. *Accept:* numbers are stored in `docs/adoption/baselines.md`. (MET-01, MET-03)

### Decision records

- [ ] **P0-10 Decision records.** Write short records in `docs/decisions/`: the 17 decisions of 16 October and the naming decision (Credo, scope @usecredo, repository hatfim/credo) (link to the PRD for detail), the Radix packaging approach, the library build tool, the Tailwind v4 minimum version, the token file format (W3C DTCG or the plugin's legacy format), the CSS variable prefix (`--cr-` is proposed), how React 18 support is implemented, the npm publishing method, and the outcome of spikes A to C. *Accept:* one record per decision, each with status accepted. (16.1) *Amended by decisions 0004 to 0011: the records are written (packaging, styling and fonts, testing and docs, release policy, token sync operations, spikes A to C). `--cr-` is accepted (0004), not proposed.*
- [ ] **P0-11 Gate 0 review.** Walk the Phase 0 row in PRD 15.3 and tick each criterion. Update the PRD wherever a spike changed an assumption. *Accept:* decision records signed and baselines recorded.

## Phase 1: foundation

Phase 1 builds the repository, the token pipeline, one component (Button) and everything around it, so the full path from source to a consumer is proven before the catalog grows. It closes at gate 1: Button flows end to end and BLD-01 to BLD-09 pass. Tasks run in the order listed; most can be done in the CLI.

### A. Repository skeleton

- [x] **P1-01 Workspace root.** `pnpm-workspace.yaml` (apps, packages, consumers), root `package.json` with `packageManager` and `engines.node` 22 or newer, `.nvmrc`, `.gitignore` (build output, Storybook output, coverage; the synced token file stays committed). *Accept:* `pnpm install --frozen-lockfile` works from a clean clone. (BLD-01, BLD-03)
- [x] **P1-02 Shared config packages.** Private `typescript-config` (base, library, app) and `eslint-config` (flat config). *Accept:* every workspace extends them, and `pnpm lint` and `pnpm typecheck` run on the empty packages. (5.1)
- [x] **P1-03 Turborepo tasks.** `turbo.json` with the tasks in PRD 11.2, declared inputs, outputs and environment variables, and root scripts including `check`. *Accept:* `pnpm check` runs through Turborepo and a second run is served from cache. (BLD-04 to BLD-07)
- [x] **P1-04 Release and hygiene tooling.** Changesets, `syncpack`, an import-boundary lint rule, and a rule that forbids component definitions inside `apps/*`. *Accept:* a deliberate violation of each rule fails `pnpm lint`. (DST-04, BLD-09)
- [x] **P1-05 Package skeletons.** `tokens`, `tailwind-config`, `ui`, `icons`, `test-utils`, the two apps and the two consumers, each with a `package.json` (exports map, `sideEffects: false`, peer dependencies, `private: true` where the PRD says so) and the build setup chosen in the decision records. *Accept:* `pnpm build` passes for every package. (BLD-01, DST-02)

### B. Tokens

- [x] **P1-06 First synced token file.** Push the first token sets from Tokens Studio: primitives, a brand scale layer (neutral, primary, secondary, destructive, success, warning, info), semantic roles in the surface, content, field, actions, state, border, feedback, alpha and shadow groups, and light and dark as separate sets. *Accept:* `packages/tokens/generated/tokens.json` arrives through the plugin, not by hand, and the role list is documented as contract v0 (docs/token-contract-v0.md). (TOK-01, TOK-02, TOK-11)
- [x] **P1-07 Raw token validation.** A script that checks valid JSON, token shape and alias resolution, adapted from the reference workflow's script. *Accept:* broken fixtures fail with readable messages, covered by unit tests. (TOK-12, TOK-15)
- [x] **P1-08 Style Dictionary build.** Use the Tokens Studio transforms to produce prefixed CSS variables (light and dark switched by an attribute), TypeScript types and a JSON schema; build output stays out of git. *Accept:* `pnpm build --filter @usecredo/tokens` produces them, and a snapshot test covers the CSS. (TOK-03, TOK-04, TOK-12)
- [x] **P1-09 Theme validator and contrast check.** A CLI that checks completeness, value types and WCAG 2.2 AA contrast for every foreground and background pair, starting with an empty baseline. *Accept:* a failing pair fails the check and the default theme passes. (TOK-06, TOK-07)
- [x] **P1-10 Token consistency test.** CSS output, types and the docs token tables must derive from the one source. *Accept:* the test fails if they diverge. (TOK-08)

### C. Tailwind integration

- [x] **P1-11 `tailwind-config`.** Map the prefixed variables to Tailwind theme values with `@theme inline`, add the radius scale, and add the precompiled stylesheet if spike A kept it. *Accept:* `bg-surface-page` resolves to the active theme in the Vite consumer. (TOK-03, D-03) *Amended by decisions 0005 and 0009: the precompiled stylesheet is dropped, so the provisional `precompiled.css` is removed in the Wave 3 code change (see the follow-ups below). The box stays ticked.*

### D. `ui` and `icons`

- [x] **P1-12 Component conventions.** The class-merge helper, variant helper, `asChild` through Slot, `data-slot` attributes, `forwardRef` for React 18 and 19, and `use client`. *Accept:* a short contributing page documents them. (CMP-01, CMP-02)
- [x] **P1-13 Button.** All variants and sizes, disabled and loading states, `asChild`, unit tests, and the subpath export `@usecredo/ui/button`. *Accept:* tests pass and importing it has no side effects. (CMP-02, CMP-04)
- [x] **P1-14 Package checks.** `publint` and `arethetypeswrong` run in `pnpm check`, plus a bundle-size test that imports only Button. *Accept:* the test fails if importing Button pulls in other components. (DST-02, DST-03)
- [x] **P1-15 `icons`.** Re-export the Phosphor icons the components use, including the server-rendering entry. *Accept:* a server component in the Next.js consumer imports an icon without error. (D-08, 5.3)

### E. Test utilities and the two apps

- [x] **P1-16 `test-utils`.** Storybook theme decorator (light, dark; a second theme is deferred, decision 0005), viewport presets, Vitest setup and an accessibility helper. *Accept:* Storybook and unit tests both use it. (9.3)
- [x] **P1-17 Storybook app.** Storybook with CSF in TypeScript, the accessibility addon, interaction tests and a theme toolbar, plus Button stories with a keyboard `play` function. *Accept:* it builds, and a smoke test renders every story. (SBK-02, SBK-03, SBK-05)
- [x] **P1-18 Docs app.** Docusaurus (as confirmed by spike B) with a Getting started skeleton, a token reference generated from the token source, and a Button page that has a live example using the real component, an API table generated from its types, and a link to its stories. Search and the link check are on. *Accept:* it builds, and a deliberately broken link fails the build. (DOC-02 to DOC-06) *Amended by decision 0003 (Storybook is not hosted): the Button page names stories by ID in text and says how to run Storybook locally; no hosted link.*
- [x] **P1-19 Cross-link check.** Read the Storybook index and fail if a story ID linked from the docs is missing, or if a stable component lacks a docs page or stories. *Accept:* removing a story fails the check. (DOC-05, 9.4) *Amended by decision 0003 (Storybook is not hosted): story IDs are referenced as inline-code text, not URLs; the failure cases are unchanged.*

### F. CI and deployment

- [x] **P1-20 Pull request workflow.** Affected lint, typecheck, test and build, the docs link check, and Storybook smoke and accessibility tests, all set as required status checks. *Accept:* a failing check blocks merge. (BLD-08, TST-02)
- [x] **P1-21 Token sync workflow.** Adapt the reference workflow as PRD 6.7 describes: validate, build, contrast check, then open or update the pull request, with the diff comment falling back to `main`, and pinned actions. *Accept:* a plugin push produces a pull request with a diff comment, and a manual run also works. (TOK-15, TOK-16)
- [x] **P1-22 Playwright snapshot job.** Use the setup from spike C as a required check that reports diffs for approval. *Accept:* a changed story uploads diff images, and baselines change only through CI. (SBK-04, TST-06)
- [x] **P1-23 Main and nightly workflows.** On `main`: the full check and a snapshot publish to the `next` channel. Nightly: the full visual run and the compatibility matrix. *Accept:* a `next` version appears on npm and a nightly run is green. (DST-07, 10)
- [x] **P1-24 Release workflow.** Changesets release pull request, publish with provenance, deploy docs and Storybook from the same commit, and fail if the commits differ. *Accept:* a dry run completes, or any limit is documented. (REL-04, DST-01) *Amended by decision 0003 (Storybook is not hosted): only the docs site is deployed and compared with the release commit.*
- [x] **P1-25 Preview deployments.** Docs and Storybook previews on every pull request. *Accept:* both preview links appear on a test pull request. (REL-03) *Amended by decision 0003 (Storybook is not hosted): a docs preview only; the acceptance is one preview link on a test pull request.*

### G. Consumers

- [x] **P1-26 Representative consumers.** `vite-app` and `next-app` install packed tarballs from a local registry in CI and render Button in light and dark. `vite-app` also has its own Tailwind config and its own CSS variables. *Accept:* both build and pass a smoke test, and the coexistence check passes. (DST-08, DST-09)

### H. Gate

- [x] **P1-27 Gate 1 review.** Follow Button from source to story, docs page, `next` snapshot and both consumers, then check BLD-01 to BLD-09. *Accept:* every item is ticked and the PRD is updated for anything that changed.
  *Closed 2026-10-17.* Verified by the reviewer on a clean checkout: the Button journey, BLD-01 to BLD-09 (BLD-04 wording fixed in the PRD), `pnpm check` (40 tasks), consumers, the `next` snapshot on npm with provenance for all four packages, a green nightly and a release dry run. Confirmed by the owner, not re-run by an agent: the token sync comment updating on a second Figma push, and the manual Button review (keyboard, screen reader, contrast). Phase 0 is still open (P0-01 to P0-11, `docs/adoption/baselines.md`, the `TODO(decision: ...)` markers) and is the precondition for Phase 2.

### I. Follow-ups from the 2026-10-17 decisions (not numbered tasks)

From decisions 0004 to 0009. Do not tick the numbered tasks above because of these.

- [ ] Add a collision test case to `consumers/vite-app` (for example the app defines `--radius-md`, `--font-sans` or a `surface` colour) and assert what wins (0005).
- [x] Add a fixture test that swaps `scale.primary` to the indigo palette and checks contrast (0005).
- [ ] Owner: change `font-family.mono` to Geist Mono in Figma and push it. Then self-host Lexend and Geist Mono in `apps/docs` and `apps/storybook` (check size and licence first) and regenerate the 10 visual baselines once (0005).
- [ ] Replace the placeholder docs host with `https://credo.trekant.dev` everywhere (0006).
- [x] Remove the provisional precompiled stylesheet and its docs page (0005, 0009).
- [x] Set the typography breakpoint constant to 768px and the Tailwind minimum to the 4.3.x peer range (0005).
- [ ] Replace the settled `TODO(decision: ...)` markers in code, config and workflows with references to the decision records (0004 to 0008). The markers in docs files were replaced in Wave 2; the remainder live in code, config and workflows (Wave 3): build-tool, consumer-version-matrix, css-prefix, docs-framework, docs-url, npm-publish-auth, precompiled-stylesheet, radix-packaging, release-tags, second-theme, snapshot-setup, tailwind-minimum, typography-breakpoint, use-client-scope, and vercel-deploy-method (which stays open). `.claude/agents/*` mentions are instructions, not markers.
- [ ] Add the workflow on `main` that merges `main` into `tokens-sync` (conflicts in `packages/tokens/generated/` keep the `tokens-sync` side; any other conflict stops, comments and fails) (0008).
- [ ] Owner: move the four packages to npm trusted publishing and delete `NPM_TOKEN` after verifying (0007).
- [ ] Owner: reset `latest` on the four packages with `npm dist-tag` so it no longer points at the snapshot (0007).
- [ ] Owner: rotate `GH_PAT` before 14 January 2027 (reminder on 1 January) (0008).
- [ ] Owner: disable Vercel production Git deploys of `main` (0007).

## Phase 2: pilot catalog

Phase 2 builds the other 14 pilot components to the full definition of done (PRD 7.3), completes the docs at MVP depth, and turns on the remaining quality gates. It closes at gate 2: all 15 components stable, docs and Storybook gates green, consumers passing the integration matrix, and targets added to PRD section 14.

Every component task below has the same base acceptance: stories for each state the component supports, unit and interaction tests, no serious accessibility violations, keyboard behavior checked, a docs page with generated API table and story links, a changeset, and light and dark rendering (second theme deferred, decision 0005). The line under each task adds only what is specific to that component.

### A. Process

- [ ] **P2-01 Pull request template and component scaffold.** A pull request template that lists the definition of done, and a script (for example `pnpm new:component`) that creates a component folder, stories, test file, docs page and changeset. *Accept:* the script produces a component that passes `pnpm check` with no edits. (CMP-05)

### B. Components (Button is already done in Phase 1)

- [ ] **P2-02 Label, Input, Textarea.** *Accept:* label association works by click and by assistive technology; disabled, read-only and invalid states have stories. (SBK-01)
- [ ] **P2-03 Checkbox, Radio Group, Switch.** *Accept:* controlled and uncontrolled use both tested; arrow-key behavior in Radio Group is covered by a `play` function. (CMP-03)
- [ ] **P2-04 Select.** *Accept:* keyboard typeahead and arrow navigation tested; long lists and long labels have stories.
- [ ] **P2-05 Form field composition.** A field that joins label, control, description and error message. *Accept:* `aria-describedby` and `aria-invalid` are wired and tested, and a recipe shows the field working with a form library chosen for the example.
- [ ] **P2-06 Dialog.** *Accept:* focus moves in on open and returns on close, Escape closes it, background scroll is locked, and each is tested.
- [ ] **P2-07 Popover and Tooltip.** *Accept:* Tooltip appears on keyboard focus as well as hover; both flip near viewport edges (story at the narrowest viewport).
- [ ] **P2-08 Tabs.** *Accept:* arrow, Home and End keys tested; controlled use tested.
- [ ] **P2-09 Toast and Alert.** First write a decision record on the toast approach (Radix Toast, or the library shadcn/ui now uses instead). *Accept:* a toast is announced to screen readers without stealing focus; Alert has stories for each status role.

### C. Themes and quality gates

- [ ] **P2-10 Second reference theme.** A contrasting brand as extra token sets, shown in Storybook and the docs. *Accept:* both reference themes pass the validator and every component story renders in both. (TOK-10) *Amended by decision 0005: the second theme is deferred and no second brand is planned; it is dropped from the MVP gate. Replace the acceptance by a fixture test that swaps `scale.primary` to the indigo palette and checks contrast, with `actions.primary.foreground` noted as hard-wired to the dark ink. (TOK-10)*
- [ ] **P2-11 Visual regression coverage.** Playwright snapshots for every stable component in light, dark and the second theme, with the approval workflow written in the docs. *Accept:* a deliberate style change produces a diff that must be approved before baselines update. (TST-05, TST-06) *Amended by decision 0005: snapshots in light and dark only, with the real fonts (baselines regenerated once, see the follow-ups below).*
- [ ] **P2-12 Manual accessibility review.** For each interactive component, run a keyboard and screen reader checklist and record the result on its docs page. *Accept:* every interactive component has a recorded review. (7.4, 10.1)
- [ ] **P2-13 Coverage ratchet.** The PRD expects a baseline at the end of Phase 1; record it first if it was missed. Then enforce thresholds that cannot decrease. *Accept:* a pull request that lowers coverage fails. (TST-08)
- [ ] **P2-14 Consumer matrix.** Nightly and pre-release runs across React 18 and 19, Vite and Next.js, and the Tailwind and precompiled-stylesheet paths (if spike A kept the fallback). Add a duplicate-dependency check. *Accept:* the matrix is green, and the duplicate check fails when a second React or Radix copy appears. (DST-05, TST-07) *Amended by decisions 0005 and 0006: no stylesheet path; the matrix is Node 22 and 24 with React 18 and 19 (React 18 on the Vite consumer only) and Next.js App Router only for now.*

### D. Documentation and governance

- [ ] **P2-15 Docs: onboarding, foundations, theming.** Getting started for a new project and for an existing app (including coexistence), the token reference for color, type, spacing, radius, shadows and responsive principles, and theming (writing and validating a theme, Tailwind integration). *Accept:* a person reaches a themed, rendered component using only these pages. (DOC-01, ADP-01, DST-10) *Amended by decision 0005: the docs state Tailwind v4 required (4.3.x tested), no precompiled stylesheet, and how to load Lexend and Geist Mono; the theming page covers light and dark only.*
- [ ] **P2-16 Docs: patterns, guidelines, accessibility.** Recipes for form composition, dialogs and feedback, do and don't examples, naming conventions and principles, and accessibility guidance. *Accept:* pages exist and their code examples are type-checked in CI. (DOC-01, DOC-07)
- [ ] **P2-17 Docs: development, release, migration.** Repository setup, scripts, architecture, contribution workflow, testing, the ownership table (PRD 12.4), a compatibility matrix page generated from the CI matrix, and an upgrade guide template. *Accept:* pages exist and the matrix page updates from CI results. (DOC-01, DST-05, REL-07)
- [ ] **P2-18 Governance files.** An RFC template and a decision-record template in the repository, lifecycle labels (experimental, stable, deprecated) shown on component pages and stories, and an `experimental` entry point with a docs banner. *Accept:* a component marked experimental shows its label in both places. (GOV-01, GOV-02, GOV-05, 7.2)

### E. Review and gate

- [ ] **P2-19 Outside review.** Ask one outside reviewer to review the token contract and the first stable components, as the solo-operation rule in PRD 7.4 requires before 1.0. *Accept:* a written review is recorded and its findings are triaged. (7.4)
- [ ] **P2-20 Metric targets.** Use the Phase 0 baselines to add a target and an owner to each indicator in PRD section 14. *Accept:* the PRD table has targets. (MET-04)
- [ ] **P2-21 Gate 2 review.** *Accept:* all 15 components are stable, docs and Storybook gates are green, consumers pass the matrix, and the PRD is updated for anything that changed. (15.3)

## Phase 3: release and first adoption

Phase 3 ships 1.0, publishes the migration material and proves the system on one real project. It closes at gate 3: the MVP exit criteria in PRD 14.1 are met.

- [ ] **P3-01 Release candidate.** Freeze the catalog and publish an `rc` prerelease of every package with Changesets. *Accept:* the `rc` versions are on npm with provenance and both consumers pass the matrix against them. (REL-04, DST-07) *Amended by decision 0007: the first `0.1.0` comes after the Phase 2 pilot gate and `1.0.0` at the Phase 3 gate; until then only snapshots under `next`. Git tags and GitHub releases start with the first stable release.*
- [ ] **P3-02 Versioned docs and Storybook.** Create the 1.0 docs snapshot, deploy Storybook for 1.0, and set the `latest` and `next` aliases. *Accept:* the docs have a version selector and the 1.0 Storybook has a stable URL. (DOC-08, REL-05) *Amended by decision 0003 (Storybook is not hosted): version and alias the docs site only; skip the Storybook deployment.*
- [ ] **P3-03 Migration and upgrade guides.** The incremental migration guide with its legacy-component mapping template, the 1.0 release notes, and the upgrade guide structure for future majors. *Accept:* a trial migration of one screen from an eligible project follows the guide without extra help. (ADP-02, ADP-03, REL-06)
- [ ] **P3-04 Security and support.** A `SECURITY.md`, response targets for security fixes, weekly automated dependency updates, a nightly audit, and a support channel with regular office hours. *Accept:* the policy is published and update pull requests arrive weekly. (12.4)
- [ ] **P3-05 First real adoption.** Pick one eligible project and bring it to adoption level 2: tokens plus at least one shared component in production. Record every gap as a proposal. *Accept:* the project is at level 2 and its gaps are logged. (13.1, ADP-04, ADP-05, ADP-07)
- [ ] **P3-06 Governance in practice.** Take one real proposal (Card, Badge or Dropdown Menu) through the RFC, review and decision-record steps. *Accept:* a decision record exists and follows the lifecycle in PRD 7.2. (GOV-01, GOV-05)
- [ ] **P3-07 Adoption measurement.** A scheduled scan of the eligible projects' manifests and imports, a published report, and the second developer survey. *Accept:* the first report is published. (MET-02, MET-03)
- [ ] **P3-08 Publish 1.0.** Merge the release pull request. *Accept:* in a brand-new app outside the monorepo, installing from public npm and following Getting started yields a themed, rendered component, and docs and Storybook were deployed from the same commit. (DST-01, REL-04, ADP-01) *Amended by decision 0003 (Storybook is not hosted): read 'docs deployed from the same commit'; Storybook is not deployed.*
- [ ] **P3-09 Gate 3 review.** Walk every exit criterion in PRD 14.1 and tick each one. Time the new-app onboarding from P3-08 as the first time-to-integrate figure. *Accept:* all criteria are met. (14.1, DST-08)
- [ ] **P3-10 Retrospective.** Review whether the governance process was too heavy or too light, decide whether a second maintainer is needed yet, and plan the backlog below. *Accept:* the PRD's risk table and roadmap are updated.

## After the MVP

Backlog candidates, to be ordered by the governance process once 1.0 is out:

- More components by RFC, starting with Card, Badge and Dropdown Menu.
- Codemods for future major versions.
- An optional source or registry distribution channel for heavily customized parts.
- Right-to-left support and translations (Phosphor's `mirrored` prop helps with icons).
- More real consumers once each reaches adoption level 2.
- A hosted visual regression service if reviewing Playwright diffs becomes a burden.
- A second maintainer and an accessibility reviewer when a second project adopts the system.
- Component sync between Figma and code (tokens already sync).
- Tokens Studio Pro, only if the Themes feature or multi-file sync becomes necessary.
