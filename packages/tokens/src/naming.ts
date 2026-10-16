import { CSS_PREFIX } from "./constants";

/** CSS custom property for a token path: prefix plus the path with dots as hyphens. */
export const cssVariable = (path: string) => `--${CSS_PREFIX}-${path.replace(/\./g, "-")}`;
