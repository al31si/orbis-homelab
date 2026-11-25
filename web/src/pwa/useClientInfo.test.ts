import { afterEach, describe, expect, it, vi } from 'vitest';
import { setLanguage, t } from '@/i18n';
import { readSafeAreaInsets } from './useClientInfo';

vi.mock('./useInstall', () => ({ useInstall: vi.fn() }));

afterEach(() => {
  vi.unstubAllGlobals();
  setLanguage('en');
});

describe('readSafeAreaInsets', () => {
  it.each([
    ['59.4px', '33.6px', { top: 59, bottom: 34 }],
    ['0px', '0px', { top: 0, bottom: 0 }],
    ['', '', { top: 0, bottom: 0 }],
  ])(
    'reads and rounds computed padding %s / %s without leaving a probe',
    (top, bottom, expected) => {
      const children = new Set<unknown>();
      const probe = {
        style: { cssText: '' },
        setAttribute: vi.fn(),
        remove: () => children.delete(probe),
      };
      vi.stubGlobal('document', {
        createElement: () => probe,
        body: { appendChild: (element: unknown) => children.add(element) },
      });
      vi.stubGlobal('getComputedStyle', (element: unknown) => {
        expect(children.has(element)).toBe(true);
        expect(probe.style.cssText).toContain('visibility: hidden');
        expect(probe.style.cssText).toContain('padding-top: env(safe-area-inset-top)');
        expect(probe.style.cssText).toContain('padding-bottom: env(safe-area-inset-bottom)');
        return { paddingTop: top, paddingBottom: bottom };
      });

      expect(readSafeAreaInsets()).toEqual(expected);
      expect(children.size).toBe(0);
    },
  );
});

describe('safe-area inset labels', () => {
  it.each([
    ['it', 'alto 59 · basso 34'],
    ['en', 'top 59 · bottom 34'],
  ] as const)('formats pixel values in %s', (language, expected) => {
    setLanguage(language);
    expect(t('diagnostics.client.safeAreaInsetsValue', { top: 59, bottom: 34 })).toBe(expected);
  });
});
