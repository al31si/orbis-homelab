import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('grows the standalone document for the iOS short viewport, capped at the large viewport', () => {
  const css = readFileSync(new URL('./base.css', import.meta.url), 'utf8');
  expect(css).toMatch(
    /@media \(display-mode: standalone\)\s*\{\s*html\s*\{\s*min-height: min\(100lvh, calc\(100% \+ env\(safe-area-inset-top, 0px\)\)\);\s*\}\s*\}/,
  );
});
