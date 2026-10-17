export interface Rgba {
  r: number;
  g: number;
  b: number;
  /** 0 to 1 */
  a: number;
}

const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export const isHexColor = (v: unknown): v is string => typeof v === "string" && HEX.test(v);

export function parseHex(hex: string): Rgba | undefined {
  if (!isHexColor(hex)) return undefined;
  let h = hex.slice(1);
  if (h.length <= 4) h = [...h].map((c) => c + c).join("");
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
  return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
}

/** The six RGB digits, lowercase, without alpha. */
export function rgbHex(hex: string): string | undefined {
  const c = parseHex(hex);
  if (!c) return undefined;
  const p = (n: number) => n.toString(16).padStart(2, "0");
  return `#${p(c.r)}${p(c.g)}${p(c.b)}`;
}

/** Composite `fg` over an opaque `bg` (source-over). */
export function composite(fg: Rgba, bg: Rgba): Rgba {
  const m = (f: number, b: number) => f * fg.a + b * (1 - fg.a);
  return { r: m(fg.r, bg.r), g: m(fg.g, bg.g), b: m(fg.b, bg.b), a: 1 };
}

/** WCAG 2.x relative luminance of an opaque colour. */
export function luminance(c: Rgba): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

export function contrastRatio(a: Rgba, b: Rgba): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
