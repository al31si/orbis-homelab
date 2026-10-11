/**
 * Locale-aware formatters (language of the instance, see `@/i18n`). Every function tolerates
 * null/undefined/NaN and returns `PLACEHOLDER`.
 */
import { getLocale, t } from '@/i18n';

export const PLACEHOLDER = '—';

const NBSP = '\u00a0';

const numberFormats = new Map<string, Intl.NumberFormat>();

function numberFormat(decimals: number): Intl.NumberFormat {
  const locale = getLocale();
  const id = `${locale}:${decimals}`;
  let format = numberFormats.get(id);
  if (!format) {
    format = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    numberFormats.set(id, format);
  }
  return format;
}

function isNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  return isNumber(value) ? numberFormat(decimals).format(value) : PLACEHOLDER;
}

export function formatPercent(value: number | null | undefined, decimals = 0): string {
  return isNumber(value) ? `${numberFormat(decimals).format(value)}%` : PLACEHOLDER;
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;

/**
 * Binary units (1 KB = 1024 B, as reported by the tools on the server).
 * Default precision: none for bytes and values >= 100, one decimal otherwise.
 */
export function formatBytes(bytes: number | null | undefined, decimals?: number): string {
  if (!isNumber(bytes)) return PLACEHOLDER;
  const sign = bytes < 0 ? '-' : '';
  let value = Math.abs(bytes);
  let unit = 0;
  const digitsFor = (v: number, u: number) => decimals ?? (u === 0 || v >= 100 ? 0 : 1);
  while (unit < BYTE_UNITS.length - 1) {
    const digits = digitsFor(value, unit);
    if (Number(value.toFixed(digits)) < 1024) break;
    value /= 1024;
    unit += 1;
  }
  const digits = digitsFor(value, unit);
  return `${sign}${numberFormat(digits).format(value)}${NBSP}${BYTE_UNITS[unit]}`;
}

export function formatBytesPerSec(bytes: number | null | undefined, decimals?: number): string {
  return isNumber(bytes) ? `${formatBytes(bytes, decimals)}/s` : PLACEHOLDER;
}

export function formatTemperature(celsius: number | null | undefined, decimals = 0): string {
  return isNumber(celsius) ? `${numberFormat(decimals).format(celsius)}${NBSP}°C` : PLACEHOLDER;
}

export function formatLatency(ms: number | null | undefined): string {
  if (!isNumber(ms)) return PLACEHOLDER;
  return ms < 1000
    ? `${numberFormat(0).format(ms)}${NBSP}ms`
    : `${numberFormat(1).format(ms / 1000)}${NBSP}s`;
}

type TimeUnit = 'day' | 'hour' | 'minute' | 'second';

const TIME_UNITS: readonly { seconds: number; unit: TimeUnit }[] = [
  { seconds: 86_400, unit: 'day' },
  { seconds: 3_600, unit: 'hour' },
  { seconds: 60, unit: 'minute' },
  { seconds: 1, unit: 'second' },
];

function unitLabel(unit: TimeUnit): string {
  switch (unit) {
    case 'day':
      return t('common.unit.day');
    case 'hour':
      return t('common.unit.hour');
    case 'minute':
      return t('common.unit.minute');
    case 'second':
      return t('common.unit.second');
  }
}

/** "3 d 4 h", "5 h 12 min", "42 min", "30 s": at most `maxParts` units, zero parts dropped. */
export function formatDuration(seconds: number | null | undefined, maxParts = 2): string {
  if (!isNumber(seconds)) return PLACEHOLDER;
  let remaining = Math.max(0, Math.floor(seconds));
  const parts: { amount: number; unit: TimeUnit }[] = [];
  for (const { seconds: size, unit } of TIME_UNITS) {
    const amount = Math.floor(remaining / size);
    remaining -= amount * size;
    if (parts.length === 0 && amount === 0) continue;
    if (parts.length >= maxParts) break;
    parts.push({ amount, unit });
  }
  while (parts.length > 1 && parts[parts.length - 1]?.amount === 0) parts.pop();
  if (parts.length === 0) return `0${NBSP}${unitLabel('second')}`;
  return parts.map(({ amount, unit }) => `${amount}${NBSP}${unitLabel(unit)}`).join(' ');
}

type DateInput = Date | number | string;

function toTime(value: DateInput): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

const dateFormats = new Map<string, Intl.DateTimeFormat>();

function dateFormat(kind: 'clock' | 'day' | 'dayYear'): Intl.DateTimeFormat {
  const locale = getLocale();
  const id = `${locale}:${kind}`;
  let format = dateFormats.get(id);
  if (!format) {
    const options: Intl.DateTimeFormatOptions =
      kind === 'clock'
        ? { hour: '2-digit', minute: '2-digit', hour12: false }
        : kind === 'day'
          ? { day: 'numeric', month: 'short' }
          : { day: 'numeric', month: 'short', year: 'numeric' };
    format = new Intl.DateTimeFormat(locale, options);
    dateFormats.set(id, format);
  }
  return format;
}

/** "09:05" (24 hour, local time). */
export function formatClock(value: DateInput | null | undefined): string {
  if (value == null) return PLACEHOLDER;
  const time = toTime(value);
  return Number.isNaN(time) ? PLACEHOLDER : dateFormat('clock').format(time);
}

/** "12 set" / "12 Sep", plus the year when it differs from the one of `now`. */
export function formatShortDate(value: DateInput | null | undefined, now: number = Date.now()) {
  if (value == null) return PLACEHOLDER;
  const time = toTime(value);
  if (Number.isNaN(time)) return PLACEHOLDER;
  const sameYear = new Date(time).getFullYear() === new Date(now).getFullYear();
  return dateFormat(sameYear ? 'day' : 'dayYear').format(time);
}

function relativeUnits(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}${NBSP}${unitLabel('second')}`;
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes}${NBSP}${unitLabel('minute')}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}${NBSP}${unitLabel('hour')}`;
  return `${Math.floor(hours / 24)}${NBSP}${unitLabel('day')}`;
}

const MONTH_SECONDS = 30 * 86_400;

/**
 * "just now", "12 s ago", "2 min ago", "3 h ago", "5 d ago", then a date. Future values read
 * "in 5 min" (Italian: "adesso", "12 s fa", "tra 5 min").
 */
export function formatRelativeTime(
  value: DateInput | null | undefined,
  now: number = Date.now(),
): string {
  if (value == null) return PLACEHOLDER;
  const time = toTime(value);
  if (Number.isNaN(time)) return PLACEHOLDER;
  const diff = Math.round((now - time) / 1000);
  const abs = Math.abs(diff);
  if (abs < 5) return t('common.time.now');
  if (abs >= MONTH_SECONDS) return formatShortDate(time, now);
  const key = diff > 0 ? 'common.time.ago' : 'common.time.in';
  return t(key, { value: relativeUnits(abs) });
}
