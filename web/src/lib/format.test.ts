import { afterEach, describe, expect, it } from 'vitest';
import type { Language } from '@shared/api';
import { setLanguage } from '@/i18n';
import {
  PLACEHOLDER,
  formatBytes,
  formatBytesPerSec,
  formatClock,
  formatDuration,
  formatLatency,
  formatPercent,
  formatRelativeTime,
  formatShortDate,
  formatTemperature,
} from './format';

const NB = '\u00a0';

/** Decimal separator and texts that differ per language. */
const LANGS: Record<
  Language,
  {
    dec: string;
    day: string;
    ago: (v: string) => string;
    in: (v: string) => string;
    now: string;
    pb: string;
    mar: RegExp;
  }
> = {
  en: {
    dec: '.',
    day: 'd',
    ago: (v) => `${v} ago`,
    in: (v) => `in ${v}`,
    now: 'just now',
    pb: '3,072',
    mar: /^12 Mar/,
  },
  it: {
    dec: ',',
    day: 'g',
    ago: (v) => `${v} fa`,
    in: (v) => `tra ${v}`,
    now: 'adesso',
    pb: '3072',
    mar: /^12 mar/,
  },
};

afterEach(() => setLanguage('en'));

describe.each(Object.keys(LANGS) as Language[])('formatters in %s', (language) => {
  const l = LANGS[language];
  const d = (whole: string, frac: string) => `${whole}${l.dec}${frac}`;
  const use = () => setLanguage(language);

  it('formatBytes uses binary units and the language decimal separator', () => {
    use();
    expect(formatBytes(0)).toBe(`0${NB}B`);
    expect(formatBytes(512)).toBe(`512${NB}B`);
    expect(formatBytes(1536)).toBe(`${d('1', '5')}${NB}KB`);
    expect(formatBytes(24 * 1024 ** 3)).toBe(`${d('24', '0')}${NB}GB`);
    expect(formatBytes(890 * 1024 ** 3)).toBe(`890${NB}GB`);
    expect(formatBytes(12.4 * 1024 ** 4)).toBe(`${d('12', '4')}${NB}TB`);
  });

  it('formatBytes promotes the unit when rounding would print 1024, honours precision and sign', () => {
    use();
    expect(formatBytes(1023.98 * 1024)).toBe(`${d('1', '0')}${NB}MB`);
    expect(formatBytes(1536, 2)).toBe(`${d('1', '50')}${NB}KB`);
    expect(formatBytes(-2048)).toBe(`-${d('2', '0')}${NB}KB`);
    // Largest unit: English groups thousands, Italian leaves four digits ungrouped.
    expect(formatBytes(3 * 1024 ** 6)).toBe(`${l.pb}${NB}PB`);
  });

  it('formatBytesPerSec and formatPercent', () => {
    use();
    expect(formatBytesPerSec(2 * 1024 * 1024)).toBe(`${d('2', '0')}${NB}MB/s`);
    expect(formatPercent(37.4)).toBe('37%');
    expect(formatPercent(37.46, 1)).toBe(`${d('37', '5')}%`);
  });

  it('temperature and latency', () => {
    use();
    expect(formatTemperature(61.6)).toBe(`62${NB}°C`);
    expect(formatLatency(42.4)).toBe(`42${NB}ms`);
    expect(formatLatency(1250)).toBe(`${d('1', '3')}${NB}s`);
  });

  it('formatDuration keeps the most significant units and uses the day unit of the language', () => {
    use();
    expect(formatDuration(30)).toBe(`30${NB}s`);
    expect(formatDuration(5 * 3600 + 12 * 60 + 9)).toBe(`5${NB}h 12${NB}min`);
    expect(formatDuration(3 * 86_400 + 4 * 3600 + 59)).toBe(`3${NB}${l.day} 4${NB}h`);
    expect(formatDuration(3 * 86_400 + 5 * 60)).toBe(`3${NB}${l.day}`);
    expect(formatDuration(86_400 + 3600 + 60, 3)).toBe(`1${NB}${l.day} 1${NB}h 1${NB}min`);
  });

  it('formatRelativeTime describes past and future', () => {
    use();
    const now = new Date(2026, 8, 29, 12, 0, 0).getTime();
    const ago = (seconds: number) => now - seconds * 1000;
    expect(formatRelativeTime(ago(2), now)).toBe(l.now);
    expect(formatRelativeTime(ago(12), now)).toBe(l.ago(`12${NB}s`));
    expect(formatRelativeTime(ago(120), now)).toBe(l.ago(`2${NB}min`));
    expect(formatRelativeTime(ago(3 * 3600 + 5), now)).toBe(l.ago(`3${NB}h`));
    expect(formatRelativeTime(ago(2 * 86_400), now)).toBe(l.ago(`2${NB}${l.day}`));
    expect(formatRelativeTime(now + 5 * 60_000, now)).toBe(l.in(`5${NB}min`));
  });

  it('formatRelativeTime switches to a calendar date after a month and rejects garbage', () => {
    use();
    const now = new Date(2026, 8, 29, 12, 0, 0).getTime();
    const old = new Date(2026, 6, 1).getTime();
    expect(formatRelativeTime(old, now)).toBe(formatShortDate(old, now));
    expect(formatRelativeTime(new Date(now - 90_000).toISOString(), now)).toBe(l.ago(`1${NB}min`));
    expect(formatRelativeTime('not-a-date', now)).toBe(PLACEHOLDER);
    expect(formatRelativeTime(null, now)).toBe(PLACEHOLDER);
  });

  it('formatShortDate adds the year only when it differs, in the language month names', () => {
    use();
    const now = new Date(2026, 8, 29).getTime();
    expect(formatShortDate(new Date(2026, 2, 12), now)).toMatch(l.mar);
    expect(formatShortDate(new Date(2026, 2, 12), now)).not.toContain('2026');
    expect(formatShortDate(new Date(2025, 2, 12), now)).toContain('2025');
  });
});

describe('language independent behaviour', () => {
  it('falls back for missing or non numeric input', () => {
    expect(formatBytes(null)).toBe(PLACEHOLDER);
    expect(formatBytes(undefined)).toBe(PLACEHOLDER);
    expect(formatBytes(Number.NaN)).toBe(PLACEHOLDER);
    expect(formatBytes(Infinity)).toBe(PLACEHOLDER);
    expect(formatBytesPerSec(null)).toBe(PLACEHOLDER);
    expect(formatPercent(null)).toBe(PLACEHOLDER);
    expect(formatTemperature(null)).toBe(PLACEHOLDER);
  });

  it('handles zero, negative and missing durations', () => {
    expect(formatDuration(0)).toBe(`0${NB}s`);
    expect(formatDuration(-5)).toBe(`0${NB}s`);
    expect(formatDuration(null)).toBe(PLACEHOLDER);
  });

  it('prints 24 hour local time', () => {
    expect(formatClock(new Date(2026, 0, 5, 9, 5))).toBe('09:05');
    expect(formatClock(new Date(2026, 0, 5, 21, 30))).toBe('21:30');
    expect(formatClock('bad')).toBe(PLACEHOLDER);
  });
});
