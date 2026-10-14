import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HTTPS_GUIDE_URL, HTTPS_OPTION_URL } from '@/lib/docs';

/** GitHub's anchor for a heading: lower case, punctuation dropped, spaces to hyphens. */
function anchor(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-');
}

describe('links from the app to the HTTPS guide', () => {
  const guide = readFileSync(new URL('../../../docs/https.md', import.meta.url), 'utf8');
  const anchors = new Set(
    guide
      .split('\n')
      .filter((line) => /^#{1,6}\s/.test(line))
      .map((line) => anchor(line.replace(/^#{1,6}\s+/, ''))),
  );

  it('points every way to a secure address at a heading that exists', () => {
    for (const [option, url] of Object.entries(HTTPS_OPTION_URL)) {
      expect(url.startsWith(`${HTTPS_GUIDE_URL}#`), option).toBe(true);
      expect(anchors.has(url.slice(url.indexOf('#') + 1)), `${option}: ${url}`).toBe(true);
    }
  });
});
