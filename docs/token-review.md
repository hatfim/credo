# Credo tokens: review and cleanup

Input: the exported token file (1,091 tokens in 10 sets). Output: `tokens.json` (739 tokens in 6 sets), `docs/tokens/token-migration-map.csv` (every old path mapped to its new path, merged, or removed) and `docs/tokens/token-value-changes.csv` (the 37 tokens whose value changed, before and after).

I did not import the result into Figma or Tokens Studio, and I did not run a Style Dictionary build. Everything below was checked with scripts over the JSON.

## What was wrong

| # | Problem | Evidence |
| --- | --- | --- |
| 1 | Two competing role vocabularies | `Theme/Value` (107 roles: `background`, `text`, `interactive`, `brand`...) and `Semantic Color` (130 roles: `surface`, `content`, `actions`...) describe the same thing. Only `Semantic Color` is mode-aware and systematic. |
| 2 | Duplicate names across sets | 99 names defined in more than one set, 69 of them with different values. `palette.gray/blue/red/green...` exist in both `Base Color` and `Primitives` with different hex values, so the later set silently wins and the light/dark difference is lost. `Theme/Value` also had `surface.overlay`, `border.default` and `border.subtle` silently overridden by `Semantic Color`. |
| 3 | Broken references | `ring.focus-border`, `ring.destructive-border` and `brand.default/emphasis/subtle/foreground` point to a set called `Backup` that does not exist. `input.border-focus` fails through `ring.focus-border`. |
| 4 | Unusable names | 122 names with spaces, brackets or underscores (for example `spacing.12px (0_75rem) (spacing-04)`), 174 PascalCase names, one name with a space inside a role (`feedback.destructive.foreground subtle`). |
| 5 | Wrong dimension values | Six font sizes in `Token/Mode 1` did not match their names (10px stored as 0.75rem, 11px, 13px, 15px, 44px, 56px). The 44px size was also wrong in `Primitives` (3rem = 48px), so `Display.Small` on desktop rendered at 48px instead of 44px. |
| 6 | Values that are not valid CSS | Font weights stored as Figma style names (`Semi Bold`). `radius.full` was `624.938rem`. 1px border was `0.063rem`. |
| 7 | Letter-spacing not scalable | Stored as fixed rem values computed for one font size. |
| 8 | Figma helper leftovers | `border.figma` (#9746ff), `alpha.neutral.figma`, and a stray `Display.X-Large.regular` string token. |
| 9 | Dark mode contrast | In the old `Theme/Value` layer, link, accent and destructive text came out at 1.06 to 1.24:1 in dark mode (they pointed at fixed colours, not mode-aware ones). In light mode, placeholder and subtle text were 2.3:1 and input borders 1.2 to 1.5:1. |
| 10 | Dark surfaces too light for text | In `Semantic Color/Dark`, elevated surfaces and overlays used neutral 700 and 600, so even white text only reaches 3.3:1 and 2.0:1. Hover and pressed states were worse. |

## New structure

Six sets, in this order (the file's `tokenSetOrder`):

| Set | Contents |
| --- | --- |
| `Primitives/Default` | `color.*` (12 palettes, the `brand` ladder, black, white), `spacing.*`, `radius.*`, `border-width.*`, `font-size.*`, `line-height.*`, `font-family.*`, `font-weight.*`. One place, no duplicates. |
| `Brand/Default` | `scale.{neutral,primary,secondary,destructive,success,warning,info}.{50..1200}`, each an alias to a palette. `primary` is the brand (`color.brand`, built around `#C8F000` at step 500); `info` stays on indigo. This is the swap point for the second reference theme. |
| `Semantic/Light` and `Semantic/Dark` | The role contract: `surface`, `content`, `field`, `actions`, `state`, `border`, `feedback`, `alpha`, `shadow`. Same 137 names in both modes. |
| `Typography/Desktop` and `Typography/Mobile` | `display`, `heading`, `paragraph`, `label` by size, each with `font-size`, `line-height`, `letter-spacing`, `font-weight`. All aliases, no raw values. |

Rules now enforced in the file: lowercase kebab-case dotted names, no spaces or brackets, no duplicate names across enabled sets, every token has a `$type`, every alias resolves, no cycles. Primitives and scales are hidden from publishing in Figma, and semantic roles carry scopes by group (surface, content, border and so on) instead of `ALL_SCOPES`.

## Changes you should review

All of these are in the original Semantic layer. I changed each one to the nearest step on the same scale that passes WCAG 2.2 AA (4.5:1 for text, 3:1 for boundaries and focus). The first group is the one that matters most.

**1. Dark surface ramp (largest visual change).** Text cannot reach 4.5:1 on neutral 700 or lighter, so the five surface levels now use steps 1200 down to 800.

| Role | Before | After |
| --- | --- | --- |
| `surface.page` | neutral.1000 `#1f2847` | neutral.1200 `#0d111f` |
| `surface.container-subtle` | neutral.900 | neutral.1100 `#161d33` |
| `surface.container` | neutral.800 `#4a5a85` | neutral.1000 `#1f2847` |
| `surface.container-elevated` | neutral.700 `#7a8cb8` | neutral.900 `#2a3654` |
| `surface.overlay` | neutral.600 `#a8b6d0` | neutral.900 `#2a3654` |
| hover and pressed states | neutral.700 to 400 | neutral.1000 to 800 |

With only five usable steps, elevated and overlay now share a base colour, and their hover and pressed states are both neutral.800 (no visible difference between hover and pressed there). A cleaner fix needs a design decision, see below.

**2. Buttons.**
- `actions.destructive` is now 600 / 700 / 800 (default / hover / pressed) in both modes. White text on the old hover (500) was 3.9:1.
- `actions.secondary` in light mode is now 800 / 900 / 1000. White text on the old 600 fill was 2.5:1.
- `actions.primary` in dark mode now matches light: 600 / 500 / 700. The old row (500 / 400 / 600) had 3.1:1 text on hover.

**3. Text and links.**
- Dark: `content.link` primary.400 to 300, `content.link-subtle` primary.500 to 300, `content.link-danger` destructive.400 to 300.
- Light: `content.link-danger` destructive.600 to 700, `content.link-external` warning.600 to 700.
- `actions.secondary.subtle-foreground` (light) secondary.700 to 800.

**4. Feedback and states.**
- Light: `feedback.success.content` success.700 to 800, `feedback.warning.content` warning.700 to 800, `state.focus.ring-success` success.500 to 600, `state.loading.foreground` neutral.600 to 800.
- Dark: `feedback.info.default` primary.500 to 400, `state.focus.ring` primary.500 to 400, `state.loading.foreground` primary.400 to 800.

Full before and after aliases and hex values for all 37 changed tokens (12 light, 25 dark) are in `docs/tokens/token-value-changes.csv`.

## Added, removed, converted

- **Added roles** (the old file only had them in `Theme/Value` or `Base Color`): `field.*` (background, foreground, placeholder, border, border-hover, border-focus), `surface.scrim`, `shadow.color.default` and `shadow.color.strong`. `radius.lg` (0.75rem) is also new, because the scale jumped from `md` to `xl`.
- **Removed:** all of `Theme/Value` (107) and `Base Color/*` (204, duplicate palettes plus `base.*`), the Figma helper tokens, the stray `regular` string, and the second copy of every non-colour primitive. The `brand.*` roles are gone because they could not resolve. `base.surface.sunken` and the extra `gray-alpha` and `amber` palettes had no users.
- **Converted:** font weights to numbers (300 to 700), font families got system fallback stacks, `radius.full` is `9999px`, border widths are `px`, and spacing, font-size and line-height tokens are named by pixel value (`spacing.16`, `font-size.14`, `line-height.24`).
- **Letter-spacing** is now a percentage of font size (`-1.5%`), calculated from your original values at their designed sizes. All 38 values landed within 0.12% of a 0.25% step and were snapped; the biggest change is `display.x-small` on desktop, -1.11% to -1%.
- **Font sizes** now use the values that match their names, so `Display.Small` desktop is 44px as designed.

## Needs your decision

1. **Dark surface ramp.** Option applied: compressed ramp above. Alternative: keep your navy page (`#1f2847`) and give elevation through borders and shadow instead of lighter fills, which keeps all states distinct but changes how cards are drawn.
2. **Secondary button (light).** I kept white text and darkened the fill. Your dark mode uses a light fill with dark text; flipping light mode to match is the other consistent option.
3. **Brand colour (decided: `#C8F000`).** See the Brand colour section below.
4. **Dark primary button.** Its fill (`#3a18b1`) passes the text rule but is only 1.3:1 against the dark container, so the button shape is weak on dark surfaces. Consider a border or a lighter fill with dark text.
5. **Dark shadows.** `shadow.color.*` in dark mode are white at 5% and 10% (as in your `Base Color/Dark`), which glows rather than shadows. I kept your values.
6. **`Illinois Mono`.** Confirm this is the real family name; I only added fallbacks.
7. **Text styles** do not set a font family. Components inherit it. Say if you want `font-family` on each style.

## Brand colour: #C8F000

`color.brand.50..1200` is a 13-step ladder built in OKLCH around `#C8F000` (step 500). `scale.primary` now points at it, and `scale.info` is new and keeps the old indigo, so informational messages do not turn lime. 28 semantic tokens changed on top of the cleanup (`docs/tokens/token-brand-changes.csv`).

- **Ink text on brand fills.** White on `#C8F000` is 1.3:1, so `actions.primary.foreground` is `neutral.1200` in both modes (14.3:1). Primary fill / hover / pressed are `primary.500 / 400 / 600` in both modes.
- **Light mode.** Lime is a fill only. Links, focus ring and interactive borders use `primary.900` / `800` (`#455500`, `#5e7300`) to reach 4.5:1 and 3:1 on white.
- **Dark mode.** Lime works directly: link `primary.300` (`#dbf88b`), ring `primary.400`, fill 14.3:1 on the page.
- **Weakness.** On white the fill is 1.3:1 against the page, so a lime button in light mode needs a border or shadow to read as a shape.
- It is 34° from the success green, so no other scale moved.
- Contrast gate after the change: 282 checks, 0 failing.

## Neutral scale and darker dark theme

The old neutral (`color.gray`) was navy, about hue 267° at chroma 0.06 to 0.07, which fought with the lime brand (hue 121°). It is now a pure neutral (zero chroma). The neutral lives outside `Brand/Default`, so a pure grey keeps working when the brand colour is swapped for the second theme. `secondary` (warm-gray) is unchanged.

The dark end of the scale was also rebuilt with denser steps (OKLab lightness 0.46, 0.30, 0.245, 0.20, 0.165, 0.13 for steps 700 to 1200), so dark surfaces can sit lower without losing distinct hover and pressed states.

| Dark surface | Before (navy) | Now |
| --- | --- | --- |
| `surface.page` | `#0d111f` | `#070707` |
| `surface.container-subtle` | `#161d33` | `#0e0e0e` |
| `surface.container` | `#1f2847` | `#161616` |
| `surface.container-elevated` / `overlay` | `#2a3654` | `#202020` |

- Dark text tiers are now `neutral.50 / 400 / 600` (primary / secondary / tertiary), more separated than before (`50 / 200 / 400`). Tertiary on pressed elevated and overlay surfaces limits this: those two states share step 800, so elevated and overlay hover and pressed look the same.
- Light mode: `content.primary` is `neutral.1200`, `content.tertiary` is `neutral.700`, so the three text tiers are clearly separated.
- `alpha.neutral.*` in light mode follows the new neutral, and `alpha.primary.*` was still the old indigo hex; it is now lime. `state.loading.foreground` (dark) is `primary.300`.
- `alpha.destructive.*` literals now match the scale: light `destructive.600` (`#cf3359`), dark `destructive.500` (`#de4b69`). They were `#d13447` and `#df4c5f`, which matched no step. Source steps for all alpha groups: neutral light `neutral.900` / dark black; primary light `primary.700` / dark `primary.500`; destructive as above.
- Contrast gate: 282 checks, 0 failing. The full list is in `docs/tokens/token-neutral-changes.csv`.

## Round 3: edits made in Figma, and the contrast list

The file synced back from Tokens Studio (750 tokens) differs from the one I delivered. I kept your edits and re-ran the checks. What changed in your version:

- `scale.warning` now points at the new `orange` palette (steps 50 to 1200) instead of `ember`.
- New roles `feedback.{error,info,success,warning}.foreground` (ink or white text on the feedback fills), and the feedback hover and pressed steps were adjusted so one foreground works on all three states.
- Dark: `border.subtle` is neutral.800, `surface.overlay` is neutral.800 (distinct from elevated), and `state.loading`, `state.read-only` and `state.disabled` foregrounds changed. `content.link-external` now uses `scale.info`.
- `$themes` now lists four Tokens Studio themes (Light, Dark, Desktop, Mobile) that just select sets.

Contrast list, decided:

- Gated at 3:1 against every base surface (page, container, container-subtle, container-elevated): `field.border*`, `state.focus.ring*`, `border.interactive*` and `border.strong*`.
- Not gated: `border.default*` and `border.subtle*`. They are decorative dividers. A component must never rely on them as the only visible boundary of a control; use `field.border` or `border.strong`.
- Also gated now: the four `feedback.*.foreground` roles against their default, hover and pressed fills (4.5:1). That brings the gate from 210 to 282 checks.

Three tokens I changed on top of your version, because the new checks failed them:

| Token | Before | After | Why |
| --- | --- | --- | --- |
| `border.strong` (light) | neutral.600 (1.7 to 2.1:1) | neutral.700 | "Strong" boundary was below 3:1 |
| `border.strong-hover` (light) | neutral.700 | neutral.800 | keeps hover darker than default |
| `feedback.warning.default` (light) | warning.600 (2.7:1 on white) | warning.700 | amber icon or border was below 3:1 |

Scale tokens (spacing, radius, border width, typography styles) are part of the contract and components may read them directly. They are not themed per mode and are exempt from the contrast check and light/dark parity. The validator checks only that they are dimensions and in ascending order.

## What this means for the PRD and tasks

- The token contract is this file's vocabulary (`surface`, `content`, `field`, `actions`, `state`, `border`, `feedback`, `alpha`, `shadow`), not the shadcn/ui names. shadcn/ui is a pattern reference only: there is no mapping table and no alias. `tailwind-config` (P1-11) exposes the roles directly with `@theme inline` (for example `bg-surface-page`).

- The file is the input for P1-06. The validator in P1-09 should cover the same checks: no unresolved aliases, no duplicate names, strict contrast over the pairs I used (282 checks, 141 per mode, all passing), and light/dark parity.
- The CSS prefix is still undecided (`--cr-` is the proposal), so token names in the file carry no prefix.

## How it was checked

- Aliases resolved in light, dark and mobile combinations: 0 unresolved, 0 cycles, 0 duplicate names.
- Light and dark semantic sets have identical keys (137 each).
- Contrast: text on every surface and its hover and pressed states, links on base surfaces, button text on every state, feedback text on containers, input text, placeholder, input boundary and focus ring, focus rings on surfaces. Result: 282 checks, 0 failing. Alpha colours were composited over the page surface.
- Not covered: disabled states (exempt from WCAG contrast), logo and decorative colours, and contrast of components that do not exist yet.
