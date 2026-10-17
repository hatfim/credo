/**
 * Single home for the token contract constants. The role list itself is not typed here:
 * it is read from `generated/tokens.json` (see docs/token-contract-v0.md).
 */

// decision 0004 (accepted): `cr` is the organization prefix (`--cr-`).
export const CSS_PREFIX = "cr";

/** Semantic role groups, in documentation order. These are the contract's taxonomy. */
export const ROLE_GROUPS = [
  "surface",
  "content",
  "field",
  "actions",
  "state",
  "border",
  "feedback",
  "alpha",
  "shadow",
] as const;
export type RoleGroup = (typeof ROLE_GROUPS)[number];

/** Token set names in the Tokens Studio file. */
export const SETS = {
  primitives: "Primitives/Default",
  brand: "Brand/Default",
  light: "Semantic/Light",
  dark: "Semantic/Dark",
  desktop: "Typography/Desktop",
  mobile: "Typography/Mobile",
} as const;

export type Mode = "light" | "dark";
export const MODES: readonly Mode[] = ["light", "dark"];

/** Pairs of sets that are alternatives of each other, so they may repeat names. */
export const ALTERNATIVE_SETS: readonly (readonly [string, string])[] = [
  [SETS.light, SETS.dark],
  [SETS.desktop, SETS.mobile],
];

/** Sets that are stacked to resolve aliases for a mode. */
export function setsForMode(mode: Mode): string[] {
  return [SETS.primitives, SETS.brand, mode === "light" ? SETS.light : SETS.dark, SETS.desktop];
}

/** Role paths (prefix match) that may hold literal colours. Everything else is an alias. */
export const LITERAL_COLOR_PREFIXES = ["alpha.", "shadow.color."] as const;

/**
 * The scale step each `alpha.<group>.*` literal takes its RGB from, per mode.
 * Documented in docs/token-contract-v0.md.
 */
export const ALPHA_SOURCES: Record<string, Record<Mode, string>> = {
  neutral: { light: "scale.neutral.900", dark: "color.black" },
  primary: { light: "scale.primary.700", dark: "scale.primary.500" },
  destructive: { light: "scale.destructive.600", dark: "scale.destructive.500" },
  white: { light: "color.white", dark: "color.white" },
  black: { light: "color.black", dark: "color.black" },
};

/** Primitive groups exported as CSS variables next to the semantic roles. */
export const SCALE_EXPORTS = ["radius", "spacing", "border-width", "font-family"] as const;

export const NAME_SEGMENT = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const TOKEN_TYPES = [
  "color",
  "dimension",
  "fontFamilies",
  "fontWeights",
  "letterSpacing",
] as const;

// decision 0005: Typography/Mobile applies below 768px, Typography/Desktop at 768px and above.
export const TYPOGRAPHY_BREAKPOINT_PX = 768;
export const MOBILE_MEDIA_QUERY = `(max-width: ${TYPOGRAPHY_BREAKPOINT_PX - 0.02}px)`;
