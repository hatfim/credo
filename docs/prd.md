# Credo Design System — Product Requirements Document

Oct 16, 2026 · @Hatfim

## 1. Executive summary

The Base Design System is a versioned, independently adoptable UI platform (tokens, React components, documentation and quality tooling) that any project in the organization can adopt without inheriting another project's branding, business logic or release schedule. The MVP builds the foundation before the catalog: monorepo and package boundaries, a token and theming contract, a small proven component set, a documentation website, Storybook, and a tested integration path for external consumers.

| Field | Value |
| --- | --- |
| Status | Draft v0.1 for review |
| Sources | Brief A, "Organization-Wide Design System: Product Scope and Architecture". Brief B, "Mandatory Requirements: Documentation Website and Storybook". |
| Precedence | Brief A sets scope and principles. Brief B is the detailed requirement for the docs site and Storybook. Both are MVP scope. |
| Owner | hatfim.ydniw, for the organization Trekant (D-01, decided 16 October 2026) |

### Recommendations at a glance

| Topic | Recommendation | Settled in |
| --- | --- | --- |
| Distribution | Versioned npm packages as the default. shadcn/ui-style source or registry distribution is an optional later channel. | Section 8 |
| Styling delivery | Tailwind CSS v4 with CSS variables and @theme inline, following shadcn/ui. A precompiled stylesheet stays as a fallback for consumers without Tailwind v4, subject to a spike. | Sections 5, 8 (D-03) |
| Docs framework | Docusaurus (decided). The Phase 0 spike against VitePress and Astro Starlight is an acceptance check. | Section 9 (D-05) |
| Versioning | Semantic versioning with Changesets. The token contract counts as public API. | Section 8 |
| Visual regression | Self-hosted Playwright snapshots to start (decided). | Section 10 (D-07) |
| Hosting | GitHub for the repository, Vercel for the docs site (decided); Storybook is not hosted (see decision 0003). Per-PR previews of the docs site. | Section 12 (D-06) |
| Integration testing | Two representative consumers that install packed artifacts, never workspace links. | Sections 8, 10 |

The briefs are consistent with each other and contain no hard contradictions. They do leave several decisions open that change the architecture, and section 2 lists them with the working assumption this PRD makes for each.

## 2. Brief review: gaps, ambiguities and working assumptions

Fourteen items in the briefs need an owner decision. Five of them (D-02, D-03, D-04, D-06, D-12) change architecture or scope. On 16 October 2026 the owner decided every item below, and the decisions raised two new items, D-16 and D-17, both now settled. Each row gives the assumption this PRD makes so the work can proceed; none is final until the owner confirms it.

### 2.1 Gaps

| ID | Gap in the briefs | Why it matters | Working assumption |
| --- | --- | --- | --- |
| D-01 | No owner, team size or funding named. | Governance, support and release duties need a named owner. | Decided: owner hatfim.ydniw, organization Trekant. Maintainer and design representative: hatfim (hatfim@trekant.dev). |
| D-02 | The consuming projects are not identified: how many, which frameworks (Vite, Next.js, Remix), React versions, SSR or React Server Components. | Decides peer-dependency ranges, `use client` handling and the integration test matrix. | Decided by following shadcn/ui: Next.js and Vite are the tested frameworks, React 19 with Tailwind v4 is the baseline, and React 18 stays in the peer range (see D-16). |
| D-03 | Consumers may not use Tailwind. Components styled with Tailwind classes need the consumer's Tailwind build to see them, or a precompiled stylesheet. | The largest adoption blocker for existing apps; shapes the token and CSS delivery. | Decided by following shadcn/ui: Tailwind v4 with CSS variables and @theme inline is the styling contract. A precompiled stylesheet stays as a fallback for consumers without Tailwind v4; a spike confirms it is cheap enough to keep. |
| D-04 | Package registry not stated (public npm, private registry, or both) and no licence. | Decides publishing, access control and provenance. | Decided: public npm. Package scope, licence and repository visibility are settled in D-15. |
| D-05 | Docs framework left to evaluation. | Affects authoring, versioning and search. | Decided: Docusaurus. The Phase 0 spike in 9.1 now acts as an acceptance check, with Starlight as the fallback if it fails. |
| D-06 | Hosting provider and CI platform not chosen; the briefs forbid assuming a provider. | Previews, access control and cost. | Decided: GitHub for the repository, Vercel for the docs site (Storybook is not hosted, see decision 0003). CI is assumed to be GitHub Actions (to confirm). |
| D-07 | Visual regression tool not chosen. | Cost, baseline storage and review workflow. | Decided: self-hosted Playwright snapshots in GitHub Actions to start. Move to a hosted service if reviewing diffs becomes a burden. |
| D-08 | Icons are "if needed" and "where justified", with no library named. | Bundle size and consistency. | Decided: Phosphor Icons, re-exported from the icons package with the server-rendering entry for server components. No custom set in the MVP (see 5.3). |
| D-09 | No design tool or token source of truth named (for example Figma). | Decides whether tokens flow from design files into code or only from code. | Decided: Figma is the source of truth, synced to the repository with Tokens Studio. A build step turns the synced token files into CSS variables and types (see 6.6). The free Tokens Studio plan is enough (D-17). |
| D-10 | No support policy: how many major versions stay supported, and for how long. | Needed for versioned docs and security fixes. | Decided: the current major plus the previous major, the latter for security and critical fixes only. |
| D-11 | No browser, locale or direction targets (RTL, i18n), no motion policy. | Affects CSS features, logical properties and testing. | Decided: the browsers Tailwind v4 supports (Chrome 111, Safari 16.4, Firefox 128 and newer). Use CSS logical properties from the start. Respect reduced-motion preferences. RTL and translations are post-MVP. |
| D-12 | The MVP component set is not listed, yet every production-ready component needs stories and docs. | Without it the MVP has no finish line. | Decided: the 15 components in section 15.2. |
| D-13 | "Eligible project" and adoption are undefined and no tooling is named to measure them. | The success metrics cannot be computed. | Decided: the owner decides which projects are eligible and keeps that list in the repository. Adoption is measured from those projects' dependency manifests. |
| D-14 | No accessibility conformance target is stated. | Defines "accessible" for every gate. | Decided: WCAG 2.2 level AA. |

### 2.2 Overlaps and tensions between the briefs

| Tension | Resolution in this PRD |
| --- | --- |
| Brief A makes versioned packages the default, but also points to shadcn/ui, which distributes source code. | Use shadcn/ui as the pattern reference only (composition, `asChild`, variant helpers, naming). Ship compiled, versioned packages. |
| "A project must not need to import the entire design system", yet components live in one `ui` package. | One package with per-component subpath exports, ESM only, and `sideEffects: false`, verified by a bundle-size test. Split packages only if the test fails. |
| Component API is documented in both the docs site and Storybook, which invites drift. | API tables are generated from the TypeScript types once and consumed by both. Hand-written prose lives only on the docs site. |
| Independent release schedules for consumers, but tokens and components must stay compatible. | `ui` declares `tokens` as a peer dependency with a documented range. A compatibility matrix is published and tested. |
| Consumers are "external", yet representative apps live in the repo for integration tests. | Those apps sit outside `apps/` and install packed tarballs from a local registry in CI. They never use `workspace:*` links. |
| Docs need "live examples" and links to Storybook. | Small examples render the real components inside MDX. Full state catalogs stay in Storybook and are referenced by story ID, not copied (Storybook is not hosted, see decision 0003). |
| Versioned documentation is required only "if multiple versions must be supported", but no support policy exists. | Treat versioned docs as required from 1.0, driven by D-10. |

## 3. Vision, goals and stakeholders

**Vision.** One shared, accessible UI foundation that every project in the organization can adopt on its own terms, so teams spend their time on product problems instead of rebuilding buttons, dialogs and form fields.

**Product statement.** The design system is an independent platform with its own roadmap, release cycle and governance. It is not a component library belonging to one application.

### 3.1 Goals

1. Build shared UI behavior once and reuse it across projects.
2. Let each project keep its own brand through supported theming, with no forks.
3. Make adoption incremental: a project can take one component, or all of them.
4. Make accessibility the default outcome of using the system.
5. Keep documentation and Storybook in sync with the shipped code by construction.
6. Make upgrades predictable through semantic versioning, deprecation policy and migration guides.

### 3.2 Non-goals

- Business components, product workflows or domain logic, even when two apps currently share a similar screen.
- Forcing one brand, one palette or one typeface on every project.
- Forcing all projects onto one release schedule or one application structure.
- A large component catalog in the MVP. The catalog grows after the foundation is proven.
- Supporting frameworks other than React in the MVP.
- A custom icon set or a design-tool plugin in the MVP.

### 3.3 Stakeholders and users

| Group | Needs from the system | How they interact |
| --- | --- | --- |
| Consuming developers | Install quickly, theme it, get typed components, upgrade without surprises. | npm packages, docs site, Storybook |
| Designers | A shared vocabulary of tokens and components; a way to propose changes. | Docs site, Storybook, RFC process |
| Project tech leads | Predictable releases, a migration path, no coupling to other projects. | Release notes, compatibility matrix, migration guides |
| Platform maintainers | Clear contribution rules, fast CI, safe releases. | Monorepo, governance process |
| Accessibility and QA | Verifiable accessibility and visual consistency. | Storybook checks, CI reports |
| Engineering leadership | Evidence of reuse and reduced duplication. | Adoption metrics (section 14) |

## 4. Scope boundaries and customization

The base design system owns shared foundations and generic UI. Projects own everything that encodes business meaning. When in doubt, the code stays in the project until evidence of shared need exists (section 7).

| Area | Base design system owns | Consuming project owns |
| --- | --- | --- |
| Tokens and themes | Primitive and semantic tokens, the theme contract, theming infrastructure, validation | Its theme values mapped to the contract; optional component tokens |
| Components | Generic, accessible UI components and their APIs | Business components, domain widgets, local compositions of shared parts |
| Behavior | Accessible interaction patterns, focus and keyboard conventions | Product workflows, domain logic, data fetching |
| Layout | Primitive layout helpers where generic | Application shells, navigation, page layouts |
| Icons | A small shared set where justified | Product-specific icons and illustrations |
| Documentation | Usage guidelines, API reference, accessibility guidance, migration guides | Product-specific usage notes |
| Quality | Test infrastructure, accessibility and visual checks, release policy | Tests of its own screens, project deployment |

### 4.1 Supported customization mechanisms

| Tier | Mechanism | Stays on the shared upgrade path? |
| --- | --- | --- |
| 1 | Theme mapping to the semantic token contract (colors, type, radius, spacing, shadows, light and dark) | Yes |
| 2 | Optional component tokens exposed by a component (for example a button's height) | Yes |
| 3 | `className`, `asChild` and slot composition on the public API | Yes |
| 4 | Project wrappers that compose shared components into local ones | Yes |
| 5 | Contribution: a new variant, prop or component proposed through the governance process | Yes, once merged |
| Not supported | Copying a component's source, patching `node_modules`, overriding internal class names or `data-` attributes not documented as public | No. Breaks without notice. |

A need that tiers 1 to 4 cannot meet is a signal to contribute (tier 5), not to fork.

## 5. Architecture and technology

The briefs' proposed structure is sound as a starting point. This PRD keeps it, adds two packages the requirements imply, and separates the representative consumer apps from `apps/` so they cannot be mistaken for internal tooling.

```text
design-system/
├── apps/
│   ├── docs/               # documentation website (private, deployed)
│   └── storybook/          # Storybook (private, not deployed; see decision 0003)
├── packages/
│   ├── tokens/             # primitive + semantic tokens, theme contract, validator   [published]
│   ├── tailwind-config/    # Tailwind integration for the token contract              [published]
│   ├── ui/                 # React components                                          [published]
│   ├── icons/              # shared icons, only if justified (D-08)                   [published, optional]
│   ├── test-utils/         # shared decorators, fixtures, test setup                  [private]
│   ├── typescript-config/  # shared tsconfig bases                                    [private]
│   └── eslint-config/      # shared lint rules                                        [private]
├── consumers/              # representative external apps for integration tests       [private, not in apps/]
│   ├── vite-app/
│   └── next-app/
├── .changeset/
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

### 5.1 Package boundaries

| Package | Responsibility | Allowed dependencies | Published |
| --- | --- | --- | --- |
| `tokens` | Token source (primitive, semantic), built CSS variables, TypeScript types, theme schema and validator CLI | None at runtime | Yes |
| `tailwind-config` | Maps the semantic tokens to Tailwind theme values and ships the precompiled stylesheet entry | `tokens` | Yes |
| `ui` | Components, hooks and utilities that implement the public API | `tokens` (peer), Radix UI, class-variance helpers; React as a peer | Yes |
| `icons` | Re-exports or wraps one icon set | React as a peer | Yes, only if justified |
| `test-utils` | Storybook decorators, Vitest setup, accessibility helpers, fixtures | `ui`, `tokens` | No |
| `typescript-config`, `eslint-config` | Shared tooling configuration | None | No |
| `apps/docs`, `apps/storybook` | Documentation site and Storybook | `ui`, `tokens`, `tailwind-config`, `test-utils` | No, `apps/docs` deployed only; Storybook is not hosted (see decision 0003) |
| `consumers/*` | Simulate external adopters | Packed `ui`, `tokens`, `tailwind-config` only | No |

**Dependency rules.** Apps depend on packages and never the reverse. Packages never import from `apps/` or `consumers/`. `ui` never imports docs or Storybook code. Rules are enforced in CI with an import-boundary lint rule, and `syncpack` (or an equivalent) keeps shared dependency versions consistent.

&#91;embedded content: package dependencies · 3 layers, one direction\]

`tokens` sits at the base with no runtime dependencies. `ui` and `tailwind-config` build on it, and the apps and consumers sit on top. `typescript-config` and `eslint-config` are private tooling packages that every workspace member uses and are left off the drawing.

### 5.2 Technology stack and compatibility

| Layer | Choice | Compatibility requirement |
| --- | --- | --- |
| UI library | React with TypeScript (strict mode) | Peer range React 18 and 19; types ship with the package |
| Primitives | Radix UI | Pin one approach (the unified `radix-ui` package or scoped `@radix-ui/react-*`) in an ADR to avoid duplicate copies in consumer bundles |
| Styling | Tailwind CSS v4 with CSS variables | Decided under D-03, following shadcn/ui. Consumers on Tailwind v3 or without Tailwind get the precompiled stylesheet as a fallback |
| Conventions | shadcn/ui patterns: variant helpers, `asChild`, composed parts, consistent naming | Reference only; no source copied from consumer projects |
| Workspace | pnpm workspaces; Node LTS | Pin pnpm through the `packageManager` field; commit the lockfile |
| Task runner | Turborepo | Remote cache optional; see section 11 |
| Component workbench | Storybook (current stable major at kickoff, React with Vite) | Stories in CSF with TypeScript |
| Unit and interaction tests | Vitest with Testing Library; Storybook interaction tests | Run in CI on every pull request |
| End-to-end and visual | Playwright (docs site and visual checks) | Tool choice for visual regression is D-07 |
| Build output | ESM with type declarations, one subpath export per component | `sideEffects: false`; verified by a bundle-size test |
| Release | Changesets with semantic versioning | See section 8 |

No layer is duplicated: one TypeScript base, one lint base and one test setup are shared through the private config packages.

### 5.3 Icons (D-08)

Icons come from Phosphor, through the MIT-licensed `@phosphor-icons/react` package. Only the `icons` package imports it.

- `icons` re-exports just the icons the components use, so consumers are not tied to the vendor package and a bundle never carries the whole set (the package exports more than 9,000 modules).
- Phosphor has a separate server-rendering entry for server components and SSR, because the default icons use React context. `icons` ships both entries, and the docs tell Next.js users which to import. Icons from the server entry cannot inherit an icon context, so default size and weight are set through the design system's own props.
- Phosphor offers six weights (thin, light, regular, bold, fill, duotone). Which ones the system allows is a design call recorded in the foundations docs.
- Informative icons take an accessible label; decorative icons are hidden from screen readers.
- Next.js consumers should enable `optimizePackageImports` for the package, or import per-icon paths, to avoid slow development builds.
- Phosphor publishes a Figma plugin, so designers can use the same set in Figma.
- Export names carry an `Icon` suffix (for example `HeartIcon`) in the README checked on 16 October 2026; the re-export layer absorbs any later renaming.

## 6. Design tokens, theming and brand architecture

Tokens are the shared contract between the platform and every project's brand. Projects choose values; the platform fixes the names and the behavior. Components read only semantic tokens, so any theme that fulfils the contract works with every component.

### 6.1 Layered token model

| Layer | Contents | Example | Who changes it |
| --- | --- | --- | --- |
| 1. Primitive | Raw values: color scales, spacing steps, type sizes, radii, shadows | `blue-600`, `space-4`, `radius-md` | Platform (defaults); a project may add its own scales |
| 2. Semantic | Meaning-based roles that components read | `surface.page`, `content.primary`, `field.border`, `actions.primary.default`, `state.focus.ring`, `border.default`, `feedback.success.default` (groups: surface, content, field, actions, state, border, feedback, alpha, shadow) | Platform owns names and meaning; projects never rename |
| 3. Theme mapping | A project's primitive values assigned to every semantic role, for light and dark | Brand A maps `primary` to its own blue | Each project |
| 4. Component (optional) | Narrow overrides where semantic roles are not enough | `button-height-md` | Platform defines which components expose them |

The semantic set uses its own role taxonomy (surface, content, field, actions, state, border, feedback, alpha, shadow), in the same names in light and dark. The names are the platform's own: shadcn/ui is a reference for component patterns only, not a naming contract, and tailwind-config exposes these roles directly (for example bg-surface-page). A brand scale layer (neutral, primary, secondary, destructive, success, warning, info, steps 50 to 1200) sits between the primitives and the semantic roles, so a project sets its brand by pointing scale.primary at its own palette. Scale tokens (spacing, radius, border width and the typography styles) are part of the contract and components may read them directly; they are not themed per mode and are exempt from the contrast check. The final list is frozen as "semantic contract v1" before the first stable release.

### 6.2 Delivery to CSS and Tailwind

- Tokens are authored in Figma with Tokens Studio and synced to the repository as JSON (section 6.6). A build step turns those files into CSS custom properties, TypeScript types and a JSON schema.
- CSS variables carry an organization prefix (for example `--cr-surface-page`) so adopting the system in an existing app cannot collide with variables the app already defines. Unprefixed names, as in shadcn/ui, are a collision risk during incremental migration.
- `tailwind-config` maps the prefixed variables to Tailwind theme values so utilities such as `bg-surface-page` and `text-content-primary` resolve to the active theme.
- Light and dark modes switch through a theme attribute on any ancestor element, with an optional `prefers-color-scheme` default. Because the switch is scoped to an element, two brands or modes can coexist on one page.
- The D-03 spike must test a consumer whose Tailwind config already defines a `surface` color, to confirm the class names and the precompiled stylesheet do not collide.

### 6.3 Theme validation

A validator ships in the `tokens` package and runs as a CLI, so projects can run it in their own CI. It fails when:

- a required semantic token is missing in the light or the dark mapping;
- a value has the wrong type (for example a color that does not parse);
- a text pair falls below 4.5:1 contrast, or a UI boundary or focus ring pair falls below 3:1 (WCAG 2.2 AA);
- a theme defines a token the contract does not contain.

### 6.4 Change management and versioning rules

| Change | Version bump | Extra gate |
| --- | --- | --- |
| Add a semantic token | Minor | Documented in the token reference |
| Rename or remove a semantic token, or change its meaning | Major | Migration note and codemod where feasible |
| Change a default primitive value | Minor | Visual regression baselines reviewed and approved by the design representative |
| Add a component token | Minor | Documented on the component page |

### 6.5 Requirements

| ID | Requirement |
| --- | --- |
| TOK-01 | The token package exposes primitive, semantic, theme-mapping and optional component layers as described in 6.1. |
| TOK-02 | Semantic token names are fixed by a versioned contract; components read only semantic or component tokens. |
| TOK-03 | Tokens are exposed as prefixed CSS variables and integrated with Tailwind CSS through `tailwind-config`. |
| TOK-04 | Light and dark modes are supported for every component, with element-scoped switching. |
| TOK-05 | A project can supply its own theme without editing platform code. |
| TOK-06 | The validator rejects incomplete, mistyped or non-contract themes and runs in platform CI and in consumer CI (consumer CI use is planned for Phase 2). |
| TOK-07 | The validator checks WCAG 2.2 AA contrast for every foreground and background pair in the contract. |
| TOK-08 | A token consistency check confirms that the CSS output, TypeScript types and docs token tables derive from the same source. |
| TOK-09 | Token ownership and the change rules in 6.4 are documented on the docs site. |
| TOK-10 | At least two reference themes ship in the repository (a default and a contrasting brand) and both pass validation. |

### 6.6 Figma token pipeline (D-09)

Figma is the source of truth for tokens. Designers edit them in the Tokens Studio plugin, which syncs JSON token files to a branch of the GitHub repository in both directions. Everything after that is automated and checked.

1. Edit tokens in Figma with Tokens Studio and push them to the tokens-sync branch, never the default branch (branch protection forbids direct pushes).
2. CI builds the synced files with Style Dictionary and the Tokens Studio transforms package, producing prefixed CSS variables, TypeScript types and the JSON schema.
3. The validator from 6.3 checks completeness, value types and WCAG contrast on the result.
4. A pull request from the sync branch, opened by hand or by a workflow, runs the required checks and needs design-representative approval.
5. Merging triggers the release rules in 6.4.

Setup notes from Tokens Studio's documentation (checked 16 October 2026): the repository needs an initial commit, such as a README; the plugin authenticates with a GitHub personal access token, so use a fine-grained token limited to this repository with contents read and write, and keep it out of the repository; and the token file format (W3C DTCG or the plugin's legacy format) is a plugin setting, which this project chooses once and records.

**Plan (D-17, resolved).** The owner confirmed the free plan is enough. The plugin's documentation lists folder (multi-file) sync, Themes and branch switching as Pro features, so on the free plan tokens sync as a single file with no Themes feature. Light, dark and the second reference theme are therefore separate token sets in that file. Section 6.7 describes the sync workflow.

| ID | Requirement |
| --- | --- |
| TOK-11 | Tokens are authored in Figma with Tokens Studio and synced to a dedicated branch of the repository. Generated output is never edited by hand. |
| TOK-12 | CI builds CSS variables, types and the schema from the synced files with Style Dictionary and the Tokens Studio transforms. |
| TOK-13 | Every token change arrives by pull request, passes the validator and the required checks, and is approved by the design representative. |
| TOK-14 | The token file format and the sync branch name are chosen once and recorded in the docs. |

### 6.7 Reference sync workflow (tokens-sync)

The owner supplied a working GitHub Actions workflow from an earlier project (it still names `@monitpay` packages). It is the starting point for this repository. In order, it does the following:

1. Runs when the Tokens Studio plugin pushes to the `tokens-sync` branch and the raw sync file changed, or when started by hand. A concurrency group stops two quick pushes from racing.
2. Checks out with a fine-grained personal access token (contents and pull requests, read and write), then installs with a frozen lockfile.
3. Validates the raw file first: valid JSON, token shape, and that every alias resolves.
4. Builds the tokens with Style Dictionary, then runs a WCAG AA contrast check on the generated CSS.
5. Runs the Turborepo build, type check and tests, then an optional Chromatic visual run that is skipped when no project token exists.
6. Opens or updates a pull request from `tokens-sync` to `main`, skips this when the branch has nothing new, and posts a comment with the before and after resolved values.

**Keep as is.**

| Behavior | Why it is right |
| --- | --- |
| Personal access token instead of the default `GITHUB_TOKEN` | GitHub does not start new workflow runs from events caused by the default token, so a pull request opened with it would not trigger the required checks |
| Raw sync file committed, generated CSS and types never committed | One reviewable diff, and the generated output cannot drift from the source |
| Validate the raw file before building | A garbled or partial push fails with a readable error, not a Style Dictionary parse error |
| Skip the pull request when nothing is ahead of `main` | Avoids a false failure right after a clean merge |
| Value-diff comment on the pull request | The reviewer sees resolved values, not raw JSON |
| Visual diffs reported but not failing the check | Every token change produces diffs, so they need review, not a red build |

**Change for this repository.**

| Item | Problem | Change |
| --- | --- | --- |
| Package and reviewer names | `@monitpay` packages and reviewer agents from the old project | Rename to `@usecredo` packages. Use CODEOWNERS for the reviewer. |
| Contrast check | It only fails on regressions against an accepted baseline, which suits a project with existing failing pairs | Start this system with an empty baseline so the check is strict (TOK-07). Keep a baseline file only for documented exceptions. |
| Visual regression | Uses Chromatic, but D-07 chose self-hosted Playwright snapshots | Replace the Chromatic steps with the Playwright snapshot job. Keep diffs reviewed and approved, not failing. |
| Unpinned action | `chromaui/action@latest` is unpinned, in a public repository that holds a token | Pin every third-party action to a version or commit SHA. |
| Pull request opens last | A failed gate leaves no pull request, so the failure is visible only in the Actions tab | Open or update the pull request right after the contrast check, and let the build, test and visual jobs run as the pull request's required checks. |
| Duplicate runs | The workflow runs build and tests, then the pull request it opens triggers the same checks again | Follows from the previous change: the workflow stops after the contrast check. |
| Diff comment on manual runs | `github.event.before` is empty for a manual run and all zeros on a branch's first push | Confirm the diff script falls back to comparing with `main`. The script was not in the file shared, so this is unverified. |
| Token lifetime | The fine-grained token expires and belongs to one person | Set an expiry reminder. Move to a GitHub App or a bot account if the team grows. |

| ID | Requirement |
| --- | --- |
| TOK-15 | A sync workflow validates the raw token file, builds the tokens, runs the contrast check, and opens or updates a pull request from `tokens-sync`, using a fine-grained token and not the default one. |
| TOK-16 | Every third-party action in every workflow is pinned to a version or commit SHA. |

## 7. Components and governance

A component enters the shared library only when multiple projects need substantially the same behavior and interaction contract, and it leaves through a published deprecation path. Projects keep the right to build their own where business needs differ.

### 7.1 Admission criteria

Every proposal is scored against the criteria in the brief. The thresholds below are proposals for the governance group to ratify.

| Criterion | Evidence required |
| --- | --- |
| Reusability | Needed by at least two projects (the "rule of two"), or one project plus design review confirming it is generic |
| Consistency | Fits the token contract and existing component conventions |
| Accessibility | Maps to a known accessible pattern (for example a WAI-ARIA authoring practice) and a Radix primitive where one exists |
| API stability | Props are small, composable and unlikely to churn; the proposal lists open API questions |
| Maintenance cost | Named maintainer; estimate of tests, stories and docs required |
| Dependencies | New runtime dependencies justified and size-checked |
| Customization | Supported tiers from section 4.1 cover the known variations |
| Genuinely shared | Side-by-side comparison of the current project implementations |

### 7.2 Component lifecycle

| Stage | Entry | Exit |
| --- | --- | --- |
| Proposed | RFC opened with the admission evidence | Triage and review by the governance group |
| Approved | RFC accepted, maintainer assigned | Implementation started |
| Experimental | Merged under an `experimental` entry point, no semver guarantee, labelled in docs and Storybook | Used by at least one real project; API reviewed |
| Stable | Meets the definition of done below | Stays stable until deprecated |
| Deprecated | Replacement exists; marked with `@deprecated`, a development-time console warning and a docs banner; migration guide published | Kept for at least one full major version cycle |
| Removed | Removed in the next major release | Release notes list the removal |

### 7.3 Definition of done for a stable component

- Built on the Radix primitive where one exists, following the shadcn/ui composition conventions.
- Reads only semantic or component tokens; works in light and dark and with the reference themes.
- Typed public API, documented props and variants, `ref` forwarding and `className` support.
- Keyboard and screen reader behavior verified, with no serious accessibility violations in Storybook checks.
- Unit tests and interaction tests for meaningful behavior.
- Storybook stories for every state the component supports (section 9.3).
- A docs page generated from the same types, with usage guidance and a link to its stories.
- Size impact measured; the per-component entry point tree-shakes.
- A changeset entry.

### 7.4 Roles and decision-making

| Role | Responsibility |
| --- | --- |
| Maintainers | Review and merge, run releases, own CI and quality gates |
| Design representative | Approves visual changes and token changes |
| Accessibility reviewer | Signs off new interactive components |
| Project champions | One per adopting project; bring needs and evidence, review RFCs |
| Governance group | Maintainers plus the design representative; ratifies admission, deprecation and breaking changes |

**Solo operation.** hatfim currently holds every role in this table. The process keeps its independent checks by other means:

- Required CI checks apply to the owner too: branch protection allows no bypass and no direct pushes to the default branch.
- Every admission, deprecation and breaking change gets a written decision record before it merges.
- Visual, token and accessibility changes need green automated checks plus a short recorded self-review checklist.
- One outside reviewer, for example a colleague, is asked to review the token contract and the first stable components before 1.0.
- A second maintainer is added once a second project adopts the system.

### 7.5 Requirements

| ID | Requirement |
| --- | --- |
| CMP-01 | Components are built on Radix UI primitives where one exists and follow shadcn/ui composition conventions. |
| CMP-02 | Every component exposes a typed API with `ref` forwarding, `className` and `asChild` or slot composition where relevant. |
| CMP-03 | Components support controlled and uncontrolled use where the pattern calls for it. |
| CMP-04 | Each component is importable on its own through a subpath export, with no side effects. |
| CMP-05 | Components meet the definition of done in 7.3 before being marked stable. |
| GOV-01 | Shared components are proposed through an RFC scored against the 7.1 criteria. |
| GOV-02 | The lifecycle in 7.2 is documented and visible: each component page and story shows its stage. |
| GOV-03 | Deprecations carry a replacement, a migration guide and a minimum removal horizon. |
| GOV-04 | Contribution, review and release responsibilities are documented, with named role holders. |
| GOV-05 | The governance group publishes a decision record for each admission, deprecation and breaking change. |

## 8. Distribution, versioning and consumer integration

Projects consume the system as versioned npm packages, which keeps them decoupled from the monorepo and from each other's release cycles. Source distribution in the shadcn/ui style stays available later as an opt-in channel for projects that need to own component code.

### 8.1 Distribution options

| Option | Strengths | Costs | Verdict |
| --- | --- | --- | --- |
| Versioned packages | Shared fixes reach everyone through an upgrade; one source of truth; clear semver contract | Customization limited to supported tiers; needs a CSS delivery story (D-03) | Default |
| Source distribution (copy components via a CLI or registry) | Full control of the code; no peer-dependency friction | Every copy drifts; fixes do not propagate; large maintenance burden; defeats "build once" | Optional later channel, only where benefits justify the cost |
| Hybrid | Packages for most, source for a few heavily customized parts | Two release paths to support and document | Revisit after 1.0 |

### 8.2 Package contract

- ESM output with bundled type declarations; each component has its own subpath export (for example `@org/ui/button`).
- An `exports` map blocks deep imports into internal files. Anything not in the map is not public API.
- `sideEffects: false` for JavaScript. CSS entry points are listed explicitly.
- Components that need client behavior carry the `use client` directive so they work under React Server Components (D-02).
- React is a peer dependency. `tokens` is a peer dependency of `ui` and `tailwind-config` with a documented range.
- Packages publish to the public npm registry with provenance enabled (D-04), which requires publishing from a public GitHub repository (D-15).

### 8.3 Versioning and releases

- Semantic versioning for every published package. Changesets records each change and generates changelogs and release pull requests.
- `tokens`, `tailwind-config` and `ui` version independently, linked by peer ranges. A compatibility matrix on the docs site lists which versions work together, and CI tests the matrix edges.
- Pre-release channels (`next` and per-pull-request snapshots) let projects try changes early.
- Breaking changes are batched into scheduled major releases and always ship with a migration guide, and a codemod where feasible. The cadence is for the governance group to set.
- Support window follows D-10: the current major plus the previous major (security and critical fixes only).

### 8.4 How external projects adopt

| Path | What the project does | What keeps it safe |
| --- | --- | --- |
| New project | Installs `ui`, `tokens` and `tailwind-config`; adds its theme file; runs the validator; imports components | Getting started guide, theme template, validator in CI |
| Existing app | Installs alongside its current UI; imports the stylesheet inside a cascade layer; prefixed variables avoid collisions; migrates one component or screen at a time | Coexistence guide, per-component imports, codemods, migration guide per major |
| Library or micro-frontend | Same as above, with `ui` as a peer dependency to avoid duplicate React or Radix copies | Peer ranges, duplicate-dependency check in the integration tests |

### 8.5 Requirements

| ID | Requirement |
| --- | --- |
| DST-01 | `tokens`, `tailwind-config` and `ui` publish as versioned packages that external projects install without referencing the monorepo. |
| DST-02 | Only documented exports are public; an `exports` map prevents deep imports. |
| DST-03 | A project can import one component without pulling in the rest; a bundle-size test proves it for a sample of components. |
| DST-04 | Releases use semantic versioning and Changesets, with generated changelogs. |
| DST-05 | A compatibility matrix between `tokens`, `tailwind-config`, `ui`, React and Tailwind is published and tested. |
| DST-06 | Breaking changes include a migration guide; codemods are provided where the change is mechanical. |
| DST-07 | Pre-release and per-pull-request snapshot versions are available for consumers to test. |
| DST-08 | Two representative consumers install packed artifacts from a local registry in CI and must build, render and pass smoke tests. |
| DST-09 | A consumer test confirms the stylesheet coexists with an app that has its own Tailwind config and its own CSS variables. |
| DST-10 | The docs site documents the install steps for a new project and for an existing app without mentioning the workspace layout. |
| DST-11 | Every published package and component works in both a Next.js app (App Router, including server rendering and server components) and a pure React single-page app (Vite). Published code uses no Next.js-only or Vite-only API, client components carry `use client`, and server-safe entries such as the icons server entry contain no client code. A feature that works in only one of them is a defect. |

## 9. Documentation website and Storybook

The docs site is the source of truth for adoption and conventions. Storybook is the source of truth for component states and behavior. Both build from the same `ui`, `tokens` and `tailwind-config` packages, and neither holds a private copy of a component.

### 9.1 Documentation framework recommendation (D-05)

Recommendation: **Docusaurus**, decided by the owner, with a time-boxed spike in Phase 0 as an acceptance check. The comparison below reflects general knowledge of each tool and must be re-verified in the spike against current versions.

| Criterion | Docusaurus | VitePress | Astro Starlight |
| --- | --- | --- | --- |
| React integration | Native: React and MDX, so real components render in pages | Vue-based; React examples need wrappers | React islands through an integration |
| Tailwind compatibility | Works through a PostCSS plugin; its own base styles need isolating from the design system's | Straightforward | Official Tailwind integration |
| Versioned docs | Built in | Not built in | Community plugin |
| Search | Hosted DocSearch or a local-search plugin | Built-in local search | Built-in static search |
| Broken-link checking | Built in at build time | Dead-link option at build time | Community plugin |
| Authoring | Markdown and MDX | Markdown | Markdown and MDX |
| Long-term fit | Large ecosystem, React-aligned, versioning solves the support-window need | Excellent speed, weaker fit with a React-only system | Strong static output, younger versioning story |

The spike passes when Docusaurus renders a live `ui` component with the default and a second theme, builds with Tailwind v4 without style leakage, searches offline in CI, creates a versioned snapshot, and fails the build on a broken link. If it fails, Starlight is the fallback.

### 9.2 Content ownership

| Content | Docs website | Storybook | Single source |
| --- | --- | --- | --- |
| Getting started, installation, principles | Primary | Link to docs | Docs MDX |
| Design tokens | Guide and reference tables | Interactive previews | Token source file |
| Component API | Reference tables and usage guidance | Interactive controls | TypeScript types (generated) |
| Variants and states | Summary and guidance | Complete story catalog | Stories |
| Accessibility | Detailed guidance | Interactive checks and examples | Docs MDX for guidance, stories for demonstrations |
| Composition recipes | Primary | Supporting stories | Docs MDX with real components |
| Visual regression | Explains the workflow | Executes it | Story snapshots |
| Contribution, architecture, releases | Primary | Not a destination | Docs MDX and Changesets |

### 9.3 Storybook coverage and conventions

Every stable component has stories for each of the following that it supports. Irrelevant states are not required.

- Default appearance; variants and sizes.
- Interactive states (hover, focus, active, open, selected), and disabled and loading states.
- Error and validation states where applicable.
- Controlled and uncontrolled behavior where applicable.
- Keyboard interaction, shown with a `play` function.
- Theme variations: light, dark and the second reference theme.
- Responsive behavior across the configured viewports.
- Edge cases (long text, empty content) and composition patterns.

Conventions: stories use CSF with TypeScript and import components through the same public paths a consumer would use, never copies. A global theme decorator, viewport presets and shared fixtures come from `test-utils`. Autogenerated prop tables are enabled and checked against the generated API reference.

### 9.4 Cross-linking and drift control

- Each component docs page names its Storybook story IDs in text (inline code); Storybook is not hosted, so there are no URLs (see decision 0003).
- Each story's parameters carry the URL of its docs page (the docs site is hosted).
- CI reads the Storybook index after the Storybook build and fails if any linked story ID is missing, or any stable component lacks a docs page or stories.
- Code samples in docs are type-checked against the public API so an example that no longer compiles fails the build.

### 9.5 Minimum docs content for the MVP

| Section | MVP content |
| --- | --- |
| Getting started | Prerequisites, install, first themed component, for new and existing apps |
| Design foundations | Token reference for color, typography, spacing, radius, shadows, responsive principles |
| Theming | CSS variables, Tailwind integration, light and dark, writing and validating a theme |
| Components | One page per stable component: API, variants, usage, composition, links to stories |
| Accessibility | Keyboard patterns, semantics, focus management, per-component notes |
| Patterns and recipes | Form composition, dialogs, feedback patterns |
| Guidelines | Do and don't examples, naming conventions, design principles |
| Development | Repository setup, scripts, architecture, contribution workflow, testing |
| Release and migration | Compatibility matrix, breaking changes, deprecations, upgrade guides |

### 9.6 Requirements

| ID | Requirement |
| --- | --- |
| DOC-01 | The docs site contains all nine sections in 9.5. |
| DOC-02 | Documentation is searchable, with clear navigation, responsive layouts and accessible, readable typography. |
| DOC-03 | Code examples are syntax highlighted; install commands and snippets have a copy button. |
| DOC-04 | Live examples render the real `ui` components where they improve understanding. |
| DOC-05 | Component pages name their stories by ID and stories link back to the docs page (9.4; see decision 0003). |
| DOC-06 | The production build and a link check run in CI and block merge on failure. |
| DOC-07 | Examples are verified against the public component API in CI. |
| DOC-08 | Documentation is versioned from 1.0 in line with the support window. |
| SBK-01 | Every stable component has stories covering the relevant items in 9.3. |
| SBK-02 | Stories use the real components from `ui`; no Storybook-only implementations exist. |
| SBK-03 | Storybook provides controls, autogenerated docs, accessibility checks, interaction tests, theme and viewport switching. |
| SBK-04 | Visual regression runs on the configured stories (tool per D-07). |
| SBK-05 | The Storybook build and a story smoke test run in CI and block merge on failure. |
| SBK-06 | Long-form onboarding and architecture content is not duplicated in Storybook. |

## 10. Testing and quality gates

Fast, deterministic checks run on every pull request and block merge. Slower or environment-heavy checks run on a schedule and on release candidates. A check moves from scheduled to per-pull-request when it becomes fast enough.

| Area | Check | Every pull request | Scheduled or release |
| --- | --- | --- | --- |
| Shared | Type checking and linting, including import-boundary rules | Yes |  |
| Shared | Component unit tests (Vitest, Testing Library) | Yes |  |
| Shared | Package build validation: export map and type checks (for example with `publint` and `arethetypeswrong`) | Yes |  |
| Shared | Token consistency: CSS, types and docs derive from one source | Yes |  |
| Shared | Reference themes pass the theme validator | Yes |  |
| Shared | Bundle-size test for per-component imports | Yes |  |
| Shared | Consumer integration tests: two consumers install packed artifacts and build | Affected packages only | Full matrix across React and Tailwind versions, nightly and before release |
| Docs | Production build and broken-link check | Yes |  |
| Docs | Examples type-checked against the public API | Yes |  |
| Docs | Navigation and search smoke test; responsive layout checks at three viewports | Yes | Full page crawl weekly |
| Docs | Accessibility scan of key pages | Yes | Full site scan weekly |
| Storybook | Production build; every story renders (smoke test) | Yes |  |
| Storybook | Interaction tests for stories with `play` functions | Yes |  |
| Storybook | Accessibility checks on every story | Yes |  |
| Storybook | Light, dark and second-theme rendering | Yes (changed stories) | Full run nightly |
| Storybook | Visual regression | Changed stories if the tool supports it (D-07) | Full run nightly and on release candidates |
| Release | Changeset present for any change to published packages | Yes |  |
| Release | Compatibility matrix and migration-guide check |  | Release candidate |

### 10.1 Rules

- Accessibility checks catch a subset of issues. They complement, and do not replace, manual keyboard and screen reader review for each new interactive component (section 7.4).
- Visual diffs require an explicit approval by the design representative before baselines update.
- Coverage thresholds are set after the first baseline run and then enforced as a ratchet that cannot decrease.
- A flaky test is quarantined within one working day and fixed or removed; it does not stay as a retry.

### 10.2 Requirements

| ID | Requirement |
| --- | --- |
| TST-01 | Every check in the table above has an owner, a command that runs locally, and a defined trigger. |
| TST-02 | Per-pull-request checks are required status checks on the default branch. |
| TST-03 | Every stable component has unit tests and, where it has behavior, interaction tests. |
| TST-04 | Accessibility checks run on every story and every pull request, and serious violations fail the build. |
| TST-05 | Theme and viewport variations are exercised for every stable component. |
| TST-06 | Visual regression has a documented approval workflow. |
| TST-07 | Consumer integration tests run against two real consumers and a version matrix before each release. |
| TST-08 | A coverage baseline is recorded in Phase 1 and a ratchet is enforced from Phase 2. |

## 11. pnpm workspace, Turborepo and CI

Both applications are first-class workspace members. Each runs on its own in development, and each builds through Turborepo with dependency-aware caching, so a change to `ui` or `tokens` rebuilds and rechecks only what depends on it.

### 11.1 Workspace

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
  - "consumers/*"
```

- Internal dependencies use the `workspace:` protocol. The lockfile is committed and CI installs with a frozen lockfile.
- Shared dependency versions are declared once (pnpm catalogs or an equivalent) and checked by `syncpack`.
- Runtime and development dependencies are kept separate in each `package.json`. `apps/*` and private packages are marked `private: true` so they cannot be published by mistake.
- Consumers sit in the workspace for convenience in development, but CI installs them from packed tarballs in an isolated directory (DST-08).

### 11.2 Task graph

| Task | Depends on | Cached | Inputs that invalidate it | Outputs |
| --- | --- | --- | --- | --- |
| `dev` | none | No (persistent) |  |  |
| `build` | `^build` (upstream packages first) | Yes | Source, package config, lockfile, shared tsconfig, relevant environment variables | `dist/**`, `storybook-static/**`, docs `build/**` |
| `typecheck` | `^build` (resolves types from built packages) | Yes | Source, tsconfig bases | None |
| `lint` | `^build` for typed rules | Yes | Source, eslint config | None |
| `test` | `^build` | Yes | Source, test setup, fixtures | None |
| `test:coverage` | `^build` | Yes | As `test` | `coverage/**` |
| `test:storybook` | `build` of the Storybook app | Yes | Stories, theme decorators | Test reports |
| `check:links` | `build` of the docs app | Yes | Docs content, story index | Report |
| `check` | root script, not a Turborepo task: `syncpack lint`, `test:release`, then `turbo run lint typecheck test build test:storybook check:links check:stories` | Via its parts |  |  |
| `clean` | none | No |  |  |

Root scripts wrap these, for example `pnpm check` runs `syncpack lint`, the release script tests and `turbo run lint typecheck test build test:storybook check:links check:stories`. Because `build` depends on `^build`, a change in `tokens` rebuilds `tailwind-config`, `ui`, the docs site and Storybook, while a docs-only change rebuilds only the docs site. The two apps have no dependency on each other, so they build in parallel.

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "globalDependencies": ["pnpm-lock.yaml", ".nvmrc", "tsconfig.base.json"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "storybook-static/**", "build/**"],
      "env": ["NODE_ENV", "DOCS_BASE_URL"]
    },
    "typecheck": { "dependsOn": ["^build"] },
    "lint": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"] },
    "test:coverage": { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "dev": { "cache": false, "persistent": true },
    "clean": { "cache": false }
  }
}
```

The file is an illustration of the structure to validate during Phase 1, not a final configuration. Cache outputs must list every generated file, including framework-specific cache folders if they are needed to reproduce a build, and every environment variable that changes output must appear in `env`. Secrets for hosted services are passed through without entering the cache key.

### 11.3 CI strategy

| Workflow | Trigger | Runs | Gate |
| --- | --- | --- | --- |
| Pull request | Every pull request | Affected `lint`, `typecheck`, `test`, `build` for all packages and both apps; docs link check; Storybook smoke and accessibility tests; changed-story visual checks; affected consumer integration; changeset check; preview deployments of the docs site | Required status checks. Failed docs or Storybook builds block merge. |
| Main | Push to the default branch | Full `check`, snapshot publish to the `next` channel, deploy the next docs site | Failure alerts maintainers |
| Nightly | Schedule | Full visual regression, full accessibility crawl, full compatibility matrix, dependency audit | Failures open issues |
| Release | Changesets release pull request merged | Full `check`, publish with provenance, deploy the versioned docs site, tag, release notes | Required before publish |

The repository is on GitHub, so the workflows above are assumed to run on GitHub Actions (to confirm under D-06). Vercel builds the docs site for previews through its GitHub integration (production deploys come from the release workflow), while the required status checks still run in CI.

### 11.4 Requirements

| ID | Requirement |
| --- | --- |
| BLD-01 | `apps/docs` and `apps/storybook` are registered in `pnpm-workspace.yaml` with explicit workspace dependencies on `ui`, `tokens` and `tailwind-config`. |
| BLD-02 | Each application starts independently in development with its own command. |
| BLD-03 | The lockfile is committed and CI installs with a frozen lockfile. |
| BLD-04 | Turborepo defines `dev`, `build`, `lint`, `typecheck`, `test`, `test:coverage` and `clean`; the root `check` script runs them with `syncpack` and the other gates, with outputs and inputs declared. |
| BLD-05 | Builds respect upstream dependencies; a change to `ui` or `tokens` invalidates dependent builds and checks. |
| BLD-06 | Independent tasks run in parallel; unrelated tasks are skipped using affected-only execution. |
| BLD-07 | Cache configuration lists every output and every environment variable that changes output. |
| BLD-08 | CI validates production builds of both applications; failures block the merge gate and the release. |
| BLD-09 | No component implementation is duplicated in `apps/*`; a lint rule forbids component definitions outside `packages/ui` in Storybook and docs source. |

## 12. Deployment, release and ownership

The docs site is a static build (Storybook is built in CI but not hosted, see decision 0003). It deploys from the same commit that publishes the packages, so what a reader sees always matches what a project can install. Hosting is on Vercel, with the repository and CI on GitHub (decided under D-06). The criteria below act as the acceptance checklist for that setup.

### 12.1 Hosting selection criteria

| Criterion | Why it matters |
| --- | --- |
| Per-pull-request preview deployments | Reviewers and designers check changes before merge |
| Access control | Needed if the sites must be internal-only (D-04) |
| Versioned deployments | Support for `/v1/`, `/v2/` and `/latest/` paths or equivalent |
| Fit with the organization's existing infrastructure, identity and compliance | Avoids a parallel platform to operate |
| Build cost and speed, CDN and caching | A docs build runs on every pull request |
| Custom domain and TLS | Stable, memorable URLs |
| Exit cost | The docs site is plain static output, so the host should be replaceable |

Vercel was chosen by the owner, so no other host is evaluated. Versioned Storybook snapshots are not published while Storybook is not hosted (see decision 0003); how versioned docs are published is settled in Phase 1.

### 12.2 URL structure

Recommendation: the docs site on its own subdomain, for example `docs.<org-domain>`, with versions as path prefixes. Storybook is not hosted (see decision 0003); if it is hosted later, a second subdomain under the same parent keeps deployments, previews and rollbacks independent.

### 12.3 Releases and alignment

1. Changesets collects changes and opens a release pull request.
2. Merging it triggers one release workflow on one commit: full `check`, publish packages with provenance, then build and deploy the docs site from that same commit under the new version path.
3. The docs site displays the exact package versions it was built from.
4. The workflow fails if the deployed commit differs from the published commit.
5. Each supported major keeps its own docs snapshot (D-10; Storybook snapshots only if hosting is added, see decision 0003); `/latest/` follows the newest stable release and `/next/` follows the default branch.

### 12.4 Ownership and maintenance

| Responsibility | Owner | Cadence |
| --- | --- | --- |
| Packages, releases, CI | Maintainers | Continuous; releases on a published schedule |
| Token contract and visual approvals | Design representative | Per change |
| Accessibility review | Accessibility reviewer | Per new interactive component |
| Documentation content | Component maintainer for component pages; maintainers for the rest | Updated in the same pull request as the change |
| Dependency updates (Radix, Tailwind, React, Storybook, docs framework) | Maintainers, using an automated update tool | Weekly review |
| Security response | Maintainers | Patch process and target times defined in Phase 1 |
| Consumer support and office hours | Maintainers with project champions | Channel plus a regular session |

hatfim.ydniw holds the owner role, and hatfim (hatfim@trekant.dev) is maintainer and design representative. hatfim also holds the accessibility reviewer role for now. Project champions are added as projects adopt the system.

### 12.5 Requirements

| ID | Requirement |
| --- | --- |
| REL-01 | The Vercel setup is checked against the 12.1 criteria and the decision is recorded. |
| REL-02 | The docs site is reachable at a stable URL (Storybook is not hosted, see decision 0003). |
| REL-03 | Every pull request gets a preview deployment of the docs site where the host supports it (Storybook is not hosted, see decision 0003). |
| REL-04 | The docs site is deployed from the same commit as the package release, and the build fails if they diverge (see decision 0003). |
| REL-05 | Versioned docs snapshots exist for each supported major version (Storybook snapshots only if hosting is added, see decision 0003). |
| REL-06 | Release notes and a migration guide accompany every major release. |
| REL-07 | Ownership and maintenance responsibilities in 12.4 are published on the docs site under Development. |

## 13. Adoption and migration strategy

Adoption is incremental by design. A project can start with tokens only, add components one at a time, and finish the migration on its own schedule, without a flag day and without waiting for other projects.

### 13.1 Adoption levels

These levels give the success metrics in section 14 something concrete to count.

| Level | Description | Typical evidence |
| --- | --- | --- |
| 0 | Not adopted | No design system dependency |
| 1 | Foundation | `tokens` and the theme installed and validated |
| 2 | Partial | One or more shared components in production, legacy UI still present |
| 3 | Primary | Shared components are the default for covered patterns; legacy used only where no shared equivalent exists |
| 4 | Complete | No legacy implementation remains for patterns the system covers |

### 13.2 Migration playbook for an existing app

1. Audit: list the project's current UI components and map each to a shared component, a gap, or a project-specific component that stays.
2. Install and theme: add the packages, write the theme, run the validator, confirm coexistence with legacy styles (cascade layers, prefixed variables).
3. Replace leaf components first (buttons, inputs, labels, badges), then composite ones (dialogs, menus, selects), then page-level patterns.
4. Verify each step with the project's own visual and accessibility checks.
5. Remove the legacy component once nothing imports it.
6. Report the new adoption level so the metrics stay current.

Gaps found in step 1 go to the governance process (section 7) as proposals. The project keeps its own implementation meanwhile.

### 13.3 Upgrades

- Every release has a changelog. Every major has a migration guide with before and after examples and a codemod where the change is mechanical.
- A deprecation warning appears at least one major release before removal (GOV-03).
- Projects upgrade on their own schedule inside the support window (D-10); the compatibility matrix says which combinations are tested.

### 13.4 Compatibility testing against representative consumers

Two consumers in `consumers/` represent the common situations: a Vite single-page app and a Next.js app with server rendering. Each installs packed artifacts, renders a page that uses a sample of components in light and dark and in two themes, and builds in production mode. The Vite consumer is also configured with its own Tailwind config and its own CSS variables, which verifies DST-09. Real projects are added as consumers once they reach adoption level 2 and agree to be tested.

Both consumers are required for every release (DST-11). The tested targets are the Next.js App Router and a Vite single-page app. The Next.js Pages Router, Next.js on React 18 (Next.js 16 needs React 19), other bundlers such as Webpack, Parcel or Create React App, and a pure React app without Tailwind (which needs the precompiled stylesheet, see D-03) are not covered by a consumer yet. Until a consumer covers them they are best effort, and the docs must not claim support for them.

### 13.5 Requirements

| ID | Requirement |
| --- | --- |
| ADP-01 | A new project can complete the Getting Started guide, with a validated theme and a rendered component, using only the public docs. |
| ADP-02 | The docs include an incremental migration guide for existing apps, with a template for mapping legacy components. |
| ADP-03 | Upgrade and migration documentation exists for every major version. |
| ADP-04 | A project can adopt tokens only, one component, or the whole system without being forced to adopt the rest. |
| ADP-05 | Adoption levels in 13.1 are defined and used in reporting. |
| ADP-06 | Compatibility tests run against the representative consumers in 13.4 for each release. |
| ADP-07 | A feedback channel and a gap-reporting path to the governance process exist and are linked from the docs. |

## 14. Success metrics

Success is measured across the organization, and no numeric target is set until Phase 0 records a baseline. Targets are added to this table at the Phase 2 exit review, and each target needs an owner.

| Indicator | Definition | Data source | Baseline to record in Phase 0 |
| --- | --- | --- | --- |
| Adoption | Eligible projects at adoption level 2 or higher, as a count and a share (eligibility per D-13) | Dependency manifests scanned across repositories | Number of eligible projects and their current UI stacks |
| Component reuse | Distinct shared components used by two or more projects | Static import analysis across repositories | Components duplicated across projects today |
| Duplication reduction | Count of local components that duplicate a shared one | Same analysis, using the mapping from migration audits | Current duplicate count per project |
| Time to integrate | Elapsed time from `install` to a themed, rendered shared component in a new project | Timed onboarding sessions and Getting Started feedback | Time to set up UI foundations in a recent new project |
| Time to build common patterns | Time to build a standard form, dialog or table with and without the system | Sampled tasks, or developer-reported estimates | Typical time in current projects |
| Accessibility defects | Open accessibility defects per consuming project, split by severity | Project issue trackers and CI accessibility reports | Count from an accessibility audit of sampled screens |
| Breaking changes and migration effort | Breaking changes per major release; hours a project spends to upgrade | Changelog and upgrade surveys | Not available before 1.0; recorded from the first upgrade |
| Package adoption and upgrade rate | Share of consumers on the latest minor, and on a supported major | Dependency manifests | Recorded at first release |
| Developer satisfaction | Survey score and free-text themes | Short survey each quarter | First survey before the MVP launches |
| Visual and interaction consistency | Share of sampled screens that pass a consistency review against the token contract | Sampled review with the design representative | First sample in Phase 0 |

### 14.1 MVP exit criteria (separate from the organization-level metrics)

The MVP is complete when the following hold. They restate the acceptance criteria of both briefs and the success criterion in Brief A.

- Both applications exist in the monorepo, use the shared packages, run independently, and build through Turborepo.
- Every stable component has relevant stories and a docs page, with links in both directions.
- The docs site contains all nine sections in 9.5, and CI validates both applications.
- No duplicated component implementations exist for documentation purposes.
- Deployment and ownership are documented.
- A new project completes the Getting Started guide, configures a theme, uses shared components, and follows the documented quality standards, without any dependency on another project's code or release schedule (ADP-01, DST-08).

### 14.2 Requirements

| ID | Requirement |
| --- | --- |
| MET-01 | Baselines for every indicator above are recorded before any target is set. |
| MET-02 | Measurement tooling for adoption, reuse and duplication runs on a schedule and its results are published. |
| MET-03 | A satisfaction survey runs before launch and then each quarter. |
| MET-04 | Targets are added at the Phase 2 exit review, each with an owner. |

## 15. MVP scope and phasing

The MVP proves the foundation on a deliberately small catalog: package boundaries, token and theme contract, component conventions, the docs site, Storybook, and the cross-project integration path. The catalog grows only after the MVP exit criteria in 14.1 are met. The briefs name no dates, team size or start date, so phases are gated by exit criteria, not calendar dates (D-01).

### 15.1 In and out of the MVP

| In the MVP | Out of the MVP |
| --- | --- |
| Monorepo with the packages in 5.1, both apps and two representative consumers | Components beyond the pilot set |
| Token contract v1, Figma token sync, validator, two reference themes, Tailwind integration | Syncing components, not tokens, between Figma and code |
| Pilot component set (15.2) at the full definition of done | Source or registry distribution channel |
| Docs site with all nine sections at the depth in 9.5, versioned from 1.0 | RTL and translations (D-11) |
| Storybook with the checks in section 10 | A custom icon set |
| CI, preview deployments, release automation, compatibility matrix | Automated codemods for future majors beyond the first |
| Governance process, RFC template and decision records | Frameworks other than React |
| Adoption baseline and measurement tooling | Numeric adoption targets (set after baselining) |

### 15.2 Pilot component set (D-12)

Fifteen components chosen to exercise every pattern the docs recipes require (forms, overlays, feedback) and every convention the system must prove (focus management, portals, controlled and uncontrolled state, validation display):

Button, Input, Textarea, Label, Checkbox, Radio Group, Switch, Select, Form field composition, Dialog, Popover, Tooltip, Tabs, Toast, Alert.

Card, Badge and Dropdown Menu are the first candidates after the MVP. The set is a proposal for the owner to confirm in Phase 0, informed by what the adopting projects duplicate most (the Phase 0 audit).

### 15.3 Phases and gates

&#91;embedded content: MVP roadmap · 4 phases, 4 gates\]

The diamond at the end of each phase is its exit gate. The table below lists the work in each phase and the full gate criteria.

| Phase | Work | Exit gate |
| --- | --- | --- |
| 0. Decisions and baseline | Close D-12 and the open items in section 16.1. Run three spikes: Tailwind delivery, docs framework, visual regression. Audit adopting projects. Record metric baselines. Write the first decision records. | Decision records signed for the architecture decisions, including those of 16 October. Baselines recorded. |
| 1. Foundation | Monorepo skeleton, `tokens` v0 with the validator, `tailwind-config`, shared tooling packages, both apps rendering one component with theme switching, CI with required checks, preview deployments, consumers scaffolded | Button flows end to end: source, story, docs page, published snapshot, installed by both consumers. BLD-01 to BLD-09 pass. |
| 2. Pilot catalog | Build the 15 components to the definition of done. Complete docs sections at MVP depth. Cross-link checks. Visual regression and accessibility gates. Reference themes. | All 15 components stable. Docs and Storybook gates green. Consumers pass the integration matrix. Targets added to section 14. |
| 3. Release and first adoption | 1.0 release candidate, versioned docs, migration and upgrade guides, one real project pilots adoption to level 2, governance process exercised on a real RFC | MVP exit criteria in 14.1 met. |
| Beyond MVP | Catalog expansion by RFC, codemods, optional source distribution, design-tool sync, RTL and translations, more consumers | Governed by the roadmap the governance group publishes |

### 15.4 Requirements

| ID | Requirement |
| --- | --- |
| MVP-01 | The MVP delivers the foundation, package boundaries, component conventions, docs site, Storybook and the integration strategy before any component outside the pilot set is added. |
| MVP-02 | Documentation and Storybook requirements from Brief B are in MVP scope and in the traceability matrix, not deferred. |
| MVP-03 | Phase exit gates in 15.3 are recorded and reviewed by the governance group. |

## 16. Risks and open decisions

### 16.1 Decision register

Assumptions for each item are in section 2.1. This register gives the deadline. Decisions needed in Phase 0 block the foundation work.

| ID | Decision | Needed by | Recommended option |
| --- | --- | --- | --- |
| D-01 | Name the owner, maintainers and design representative | Phase 0 | Decided: owner hatfim.ydniw, organization Trekant |
| D-02 | Consumer scope: frameworks, React versions, SSR | Phase 0 | Decided: Next.js and Vite; React 19 with Tailwind v4 baseline, React 18 in the peer range; both stay first-class (DST-11) |
| D-03 | CSS delivery for consumers with and without Tailwind | Phase 0 | Decided: Tailwind v4 per shadcn/ui; precompiled stylesheet as fallback (spike) |
| D-04 | Registry, licence and visibility | Phase 0 | Decided: public npm; scope and licence per D-15 |
| D-05 | Docs framework | Phase 0 (spike) | Decided: Docusaurus; the Phase 0 spike is an acceptance check |
| D-06 | Hosting provider and CI platform | Phase 0 | Decided: GitHub and Vercel; CI assumed GitHub Actions. Acceptance checklist: 12.1 criteria |
| D-07 | Visual regression tool | Phase 0 (spike) | Decided: self-hosted Playwright snapshots to start |
| D-08 | Icon library | Phase 1 | Decided: Phosphor Icons |
| D-09 | Token source and design-tool sync | Phase 1 | Decided: Figma tokens through Tokens Studio sync (6.6) |
| D-10 | Support window for old majors | Phase 2 | Decided: current plus previous major |
| D-11 | Browser, locale and direction targets | Phase 1 | Decided: browsers Tailwind v4 supports; logical CSS properties; RTL post-MVP |
| D-12 | MVP component set | Phase 0 | Decided: the 15 in 15.2 |
| D-13 | Definition of an eligible project and measurement method | Phase 0 | Decided: the owner declares which projects are eligible |
| D-14 | Accessibility conformance target | Phase 0 | Decided: WCAG 2.2 AA |

Three smaller decisions are settled by decision records during Phase 1: the Radix packaging approach, the library build tool, and the Tailwind v4 minimum version.

**Items confirmed on 16 October 2026**

- **D-15, npm scope, licence and repository visibility.** Confirmed: scope `@usecredo` (this replaces the earlier @trekant scope; the npm organization usecredo must be created by the owner, the product is named Credo, and the repository is git@github.com:hatfim/credo.git), the MIT licence (each published package carries a LICENSE file and the license field), and a public GitHub repository, because npm provenance requires publishing from one. Everything in a public package and repository is public, so no internal-only content may live there.
- **D-16, React 18 support.** shadcn/ui's current components target React 19 and no longer use `forwardRef`. Keeping React 18 in the peer range means keeping `forwardRef` and a React 18 row in the test matrix. Confirmed: keep React 18 and 19 until the adoption data (D-13) shows no consumer on 18.
- **D-03 follow-up.** shadcn/ui avoids the CSS delivery problem by copying source into the consumer's own Tailwind build. A packaged library cannot, so the spike decides whether the precompiled stylesheet fallback stays.
- **CI platform.** GitHub Actions is assumed because the repository is on GitHub. Confirm.

**Resolved: D-17, Tokens Studio plan.** The owner confirmed the free plan is enough, using the sync workflow in 6.7. Tokens sync as a single file with no Themes feature, so light, dark and the second reference theme are separate token sets.

### 16.2 Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Existing apps without Tailwind cannot adopt cleanly | Low adoption | D-03 spike; precompiled stylesheet; coexistence test (DST-09) |
| Class or variable collisions with legacy styles | Broken screens during migration | Prefixed variables, cascade layers, coexistence fixture |
| Catalog grows before conventions are proven | Rework and API churn | MVP-01; experimental stage in 7.2; admission criteria |
| Docs and Storybook drift from shipped code | Loss of trust | Generated API tables, type-checked examples, cross-link CI, same-commit deploys |
| Governance too heavy or too light | Contributors bypass it, or the library stalls | Start with the lightweight RFC in section 7; review it at the Phase 2 exit |
| Limited maintainer capacity | Roadmap stalls | The owner is named (D-01). One person holds the owner, maintainer, design and review roles by choice. The safeguards in 7.4 stand in for a second reviewer, and a second maintainer is recommended once another project adopts the system. |
| Breaking changes anger consumers on different release schedules | Projects pin and fall behind | Batched majors, migration guides, support window, compatibility matrix |
| CI cost and time grow with two applications and visual tests | Slow feedback | Affected-only execution, caching, changed-story visual checks |
| Dependency churn in Radix, Tailwind, Storybook and the docs framework | Maintenance load | Weekly automated updates, pinned versions, nightly matrix |
| Accessibility automated checks give false confidence | Defects reach products | Manual review requirement (7.4, 10.1) |
| Duplicate Radix or React copies in consumer bundles | Bundle growth, bugs | Peer dependencies, duplicate check in integration tests |

## 17. Traceability matrix

Every mandatory item in both briefs maps to a PRD section, a requirement ID and a way of verifying it. Brief A items are numbered by its sections (A2.3 is Brief A, section 2.3). Brief B items likewise.

### 17.1 Brief A: product scope and architecture

| Brief item | PRD sections | Requirement IDs | Verified by |
| --- | --- | --- | --- |
| A1 Independent platform, not one app's library | 3, 4 | MVP-01 | Architecture review; consumers install without the monorepo |
| A2.1 Build once, reuse, controlled updates, incremental adoption | 3, 7, 8, 13 | CMP-04, DST-01, DST-03, ADP-04 | Bundle-size test; consumer tests |
| A2.2 Required stack and compatibility | 5.2 | BLD-01, DST-05 | Compatibility matrix in CI |
| A2.3 Shared foundations vs project-specific UI | 4 | GOV-01 | Admission review of each proposal |
| A2.4 Customization without fragmentation | 4.1 | TOK-05, CMP-02 | Docs review; coexistence test |
| A3 Integration into existing apps and new projects | 8.4, 13 | ADP-01, ADP-02, DST-10 | Timed onboarding; coexistence test (DST-09) |
| A3 Independent deployment and release schedules | 8.3, 12 | DST-04, DST-05 | Compatibility matrix |
| A3 Backward compatibility and breaking-change management | 8.3, 13.3 | DST-06, GOV-03, ADP-03 | Release checklist |
| A3 Project-specific theming | 6 | TOK-05, TOK-06, TOK-10 | Validator on two reference themes |
| A3 Compatibility testing against representative apps | 13.4 | DST-08, DST-11, ADP-06, TST-07 | Consumer integration job |
| A3 No need to import the whole system; no monorepo coupling | 8.2 | DST-02, DST-03 | Export map test; bundle-size test |
| A4 Layered token model | 6.1 | TOK-01, TOK-02 | Schema check |
| A4 CSS variables and Tailwind integration | 6.2 | TOK-03 | Consumer render test |
| A4 Light and dark, accessible contrast | 6.3 | TOK-04, TOK-07, TST-05 | Validator; story checks |
| A4 Token ownership, change management, validation | 6.3, 6.4 | TOK-06, TOK-08, TOK-09, TOK-11 to TOK-16 | CI |
| A5 Component governance and lifecycle | 7 | GOV-01 to GOV-05, CMP-05 | RFC records; definition-of-done checklist |
| A6 Monorepo structure and boundaries | 5.1 | BLD-01, BLD-09 | Import-boundary lint rule |
| A6 Versioned packages as default; documented external consumption | 8.1, 8.4 | DST-01, DST-10 | Docs review |
| A7 Docs and Storybook mandatory, on real packages | 9 | DOC-01 to DOC-08, SBK-01 to SBK-06 | See 17.2 |
| A8 Success indicators, baselines before targets | 14 | MET-01 to MET-04 | Phase 0 exit gate |
| A9 Required PRD outcome: shared vs reusable vs project, branding, ownership, governance, adoption | 4, 6, 7, 8, 12, 13 | MVP-01 | Review of this document |
| A9 MVP order: foundation before catalog expansion | 15 | MVP-01, MVP-03 | Phase gates |
| A9 Success criterion: new project adopts independently | 14.1 | ADP-01, DST-08 | Onboarding test with a real new project |

### 17.2 Brief B: documentation website and Storybook

| Brief item | PRD sections | Requirement IDs | Verified by |
| --- | --- | --- | --- |
| B1 Both apps first-class in pnpm and Turborepo; structure validated | 5, 11 | BLD-01, BLD-04 | CI |
| B2 Docs sections (nine) | 9.5 | DOC-01 | Docs review against the checklist |
| B2 Search, navigation, responsive, highlighted and copyable code, live examples | 9.6 | DOC-02, DOC-03, DOC-04 | Playwright smoke tests |
| B2 Links between docs and Storybook | 9.4 | DOC-05 (by story ID, see decision 0003) | Cross-link CI check |
| B2 Build and link validation in CI | 10, 11.3 | DOC-06 | CI |
| B2 Framework evaluated and recommended | 9.1 | D-05 | Phase 0 spike |
| B3 Stories for every production-ready component, relevant states only | 9.3 | SBK-01 | Coverage check in CI |
| B3 Controls, autogenerated docs, a11y, interaction, visual, themes, viewports, keyboard, TypeScript, decorators | 9.3, 10 | SBK-03, SBK-04, TST-04, TST-05 | Storybook CI |
| B3 Stories use real shared components | 9.3 | SBK-02, BLD-09 | Lint rule |
| B3 No duplication of long-form docs in Storybook | 9.2 | SBK-06 | Review |
| B4 Content ownership between docs and Storybook; shared sources | 9.2 | DOC-07 | Generated API tables; type-checked examples |
| B5 pnpm requirements: registration, explicit dependencies, independent commands, lockfile, no duplicates | 11.1 | BLD-01, BLD-02, BLD-03, BLD-09 | CI frozen install |
| B6 Turborepo task graph, cache inputs and outputs, CI strategy | 11.2, 11.3 | BLD-04 to BLD-08 | CI and cache audits |
| B7 Quality gates per application and shared; per-PR vs scheduled | 10 | TST-01 to TST-08 | Required status checks |
| B8 Deployment, domain, previews, versioned docs, release alignment, ownership | 12 | REL-01 to REL-07 | Release dry run |
| B9.1 Both applications exist in the monorepo | 5, 15.3 | BLD-01 | Phase 1 gate |
| B9.2 Both use the shared packages | 5.1 | BLD-01, SBK-02 | Dependency check |
| B9.3 Both run independently in development | 11.1 | BLD-02 | Local run in CI smoke job |
| B9.4 Both build through Turborepo | 11.2 | BLD-04, BLD-08 | CI |
| B9.5 Every production-ready component has relevant stories | 9.3 | SBK-01 | Coverage check |
| B9.6 Docs contain onboarding, foundations, theming, components, accessibility, contribution | 9.5 | DOC-01 | Docs review |
| B9.7 Component docs and stories link both ways | 9.4 | DOC-05 | Cross-link check |
| B9.8 Automated checks validate both applications in CI | 10, 11.3 | DOC-06, SBK-05, TST-02, BLD-08 | Required checks |
| B9.9 No duplicated component implementations for documentation | 9.3, 11.1 | SBK-02, BLD-09 | Lint rule |
| B9.10 Deployment and ownership documented | 12 | REL-01 to REL-07 | Docs review |
| B final: requirements are in MVP scope and in this matrix | 15 | MVP-02 | This table |

## Sources

- [shadcn/ui: Tailwind v4 and React 19](https://ui.shadcn.com/docs/tailwind-v4) (checked 16 October 2026): Tailwind v4 and `@theme inline`, React 19, `data-slot`, no `forwardRef`; existing Tailwind v3 and React 18 apps keep working.
- [shadcn/ui: Installation](https://ui.shadcn.com/docs/installation) (checked 16 October 2026): Next.js, Vite, TanStack Start, React Router, Astro and Laravel setups.
- [shadcn/ui: Theming](https://ui.shadcn.com/docs/theming) (checked 16 October 2026): unprefixed CSS variables, surface and `-foreground` pairs, OKLCH colors, `.dark` class.
- [shadcn/ui: Next.js 15 and React 19](https://ui.shadcn.com/docs/react-19) (checked 16 October 2026): React 19 peer dependency handling with npm.

* [Tailwind CSS: Compatibility](https://tailwindcss.com/docs/compatibility) (checked 16 October 2026): Chrome 111, Safari 16.4 and Firefox 128 as the minimum browsers for v4.
* [@phosphor-icons/react](https://github.com/phosphor-icons/react) (checked 16 October 2026): MIT licence, tree-shaking, separate server-rendering entry, six weights, Figma plugin.
* [Tokens Studio: GitHub sync](https://docs.tokens.studio/token-storage/remote/sync-git-github) (checked 16 October 2026): two-way JSON sync with a GitHub repository; multi-file sync, Themes and branch switching are Pro features.
