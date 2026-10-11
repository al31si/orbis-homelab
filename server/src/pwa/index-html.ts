import type { AppInfo, BootConfig } from '../../../shared/api.js';
import { escapeHtml } from './escape.js';

/** Tokens the frontend writes into `index.html` and this module replaces. */
const TOKENS = [
  'LANG',
  'TITLE',
  'DESCRIPTION',
  'APP_SHORT_NAME',
  'ICON_LINKS',
  'BOOT_JSON',
] as const;
type Token = (typeof TOKENS)[number];

/** iOS portrait launch screens, as `<width>x<height>` of the image -> device CSS size and ratio. */
const SPLASH_SCREENS: { size: string; width: number; height: number; ratio: number }[] = [
  { size: '750x1334', width: 375, height: 667, ratio: 2 },
  { size: '1170x2532', width: 390, height: 844, ratio: 3 },
  { size: '1179x2556', width: 393, height: 852, ratio: 3 },
  { size: '1290x2796', width: 430, height: 932, ratio: 3 },
  { size: '1620x2160', width: 810, height: 1080, ratio: 2 },
  { size: '1640x2360', width: 820, height: 1180, ratio: 2 },
  { size: '1668x2388', width: 834, height: 1194, ratio: 2 },
  { size: '2048x2732', width: 1024, height: 1366, ratio: 2 },
];

/** File names (under `splash/`) the renderer looks for. */
export const SPLASH_FILES = SPLASH_SCREENS.map((s) => `${s.size}.png`);

/** Favicon, apple-touch-icon and the launch images that exist (`availableSplash`: file names). */
export function renderIconLinks(availableSplash: ReadonlySet<string>): string {
  const links = [
    '<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />',
    '<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />',
  ];
  for (const s of SPLASH_SCREENS) {
    if (!availableSplash.has(`${s.size}.png`)) continue;
    const media = `(device-width: ${s.width}px) and (device-height: ${s.height}px) and (-webkit-device-pixel-ratio: ${s.ratio}) and (orientation: portrait)`;
    links.push(
      `<link rel="apple-touch-startup-image" href="/splash/${s.size}.png" media="${media}" />`,
    );
  }
  return links.join('\n    ');
}

export interface IndexHtmlInput {
  app: AppInfo;
  boot: BootConfig;
  iconLinks: string;
}

/** Fails fast (at startup) when the web bundle lacks a token or has one this server does not know. */
export function checkIndexTemplate(template: string): void {
  const known: readonly string[] = TOKENS;
  const found = [...template.matchAll(/%%([A-Z_]+)%%/g)].map((m) => m[1] ?? '');
  const problems = [
    ...TOKENS.filter((t) => !found.includes(t)).map((t) => `missing %%${t}%%`),
    ...found.filter((t) => !known.includes(t)).map((t) => `unknown %%${t}%%`),
  ];
  if (problems.length > 0) throw new Error(`index.html template: ${problems.join(', ')}`);
}

/**
 * Renders `index.html`: every value is HTML-escaped (the boot JSON included, as an attribute
 * value) and substituted in one pass, so a value can never be re-interpreted as a token.
 * `iconLinks` is markup built by this module from fixed strings, hence inserted as is.
 */
export function renderIndexHtml(template: string, input: IndexHtmlInput): string {
  const { app, boot, iconLinks } = input;
  const values: Record<Token, string> = {
    LANG: escapeHtml(app.language),
    TITLE: escapeHtml(app.name),
    DESCRIPTION: escapeHtml(app.description),
    APP_SHORT_NAME: escapeHtml(app.shortName),
    ICON_LINKS: iconLinks,
    BOOT_JSON: escapeHtml(JSON.stringify(boot)),
  };
  return template.replace(/%%([A-Z_]+)%%/g, (whole, name: string) =>
    (TOKENS as readonly string[]).includes(name) ? values[name as Token] : whole,
  );
}
