/**
 * Instance accent colour (`app.accent`, a `#rrggbb` value validated by the server). The built-in
 * tokens in styles/tokens.css stay in force when it is null. `public/theme-init.js` applies the
 * same derivation before first paint: keep the two in sync (accent.test.ts compares them).
 */

export interface AccentTokens {
  accent: string;
  /** Pressed / hover state of filled buttons. */
  strong: string;
  /** Translucent tint for selected rows and active tabs. */
  soft: string;
  /** Text colour readable on top of `accent`. */
  foreground: string;
}

const HEX = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const LIGHT_FOREGROUND = '#ffffff';
const DARK_FOREGROUND = '#04182f';
const SOFT_ALPHA = '14%';
const STRONG_MIX = 0.82;

type Rgb = readonly [number, number, number];

function channel(value: number): number {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance([r, g, b]: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: number, b: number): number {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`;
}

/** Null for anything that is not `#rrggbb`: the caller keeps the built-in accent. */
export function deriveAccent(color: string | null | undefined): AccentTokens | null {
  const match = color ? HEX.exec(color) : null;
  if (!match) return null;
  const rgb = [match[1], match[2], match[3]].map((part) =>
    parseInt(part ?? '0', 16),
  ) as unknown as Rgb;
  const luminance = relativeLuminance(rgb);
  const whiteContrast = contrast(1, luminance);
  const darkContrast = contrast(luminance, relativeLuminance([4, 24, 47]));
  return {
    accent: toHex(rgb),
    strong: toHex(rgb.map((value) => value * STRONG_MIX) as unknown as Rgb),
    soft: `rgb(${rgb.join(' ')} / ${SOFT_ALPHA})`,
    foreground: whiteContrast >= darkContrast ? LIGHT_FOREGROUND : DARK_FOREGROUND,
  };
}

/** Overrides the accent tokens on `root` (inline, so they win over both themes). */
export function applyAccent(
  color: string | null | undefined,
  root: HTMLElement = document.documentElement,
): void {
  const tokens = deriveAccent(color);
  if (!tokens) return;
  root.style.setProperty('--accent', tokens.accent);
  root.style.setProperty('--accent-strong', tokens.strong);
  root.style.setProperty('--accent-soft', tokens.soft);
  root.style.setProperty('--accent-fg', tokens.foreground);
}
