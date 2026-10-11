import { describe, expect, it } from 'vitest';
import { deriveStatus, type StatusInput } from './status';

const NOW = 1_000_000;
const base: StatusInput = {
  hasData: true,
  fetchedAt: NOW - 1_000,
  intervalMs: 10_000,
  snapshotError: null,
  fetchError: null,
  offline: false,
};

describe('deriveStatus', () => {
  it('is ready for fresh data', () => {
    expect(deriveStatus(base, NOW)).toBe('ready');
  });

  it('turns stale once older than 2.5 intervals', () => {
    expect(deriveStatus({ ...base, fetchedAt: NOW - 25_000 }, NOW)).toBe('ready');
    expect(deriveStatus({ ...base, fetchedAt: NOW - 25_001 }, NOW)).toBe('stale');
  });

  it('is stale when the snapshot carries an error, even if recent', () => {
    expect(deriveStatus({ ...base, snapshotError: 'glances down' }, NOW)).toBe('stale');
  });

  it('is stale when the last request failed but data is kept', () => {
    expect(deriveStatus({ ...base, fetchError: 'Errore 500' }, NOW)).toBe('stale');
  });

  it('reports offline before anything else when the BFF is unreachable', () => {
    expect(deriveStatus({ ...base, offline: true }, NOW)).toBe('offline');
    expect(deriveStatus({ ...base, hasData: false, fetchedAt: null, offline: true }, NOW)).toBe(
      'offline',
    );
  });

  it('distinguishes first load from failure when no data exists', () => {
    const empty = { ...base, hasData: false, fetchedAt: null };
    expect(deriveStatus(empty, NOW)).toBe('loading');
    expect(deriveStatus({ ...empty, fetchError: 'Errore 500' }, NOW)).toBe('error');
    expect(deriveStatus({ ...empty, snapshotError: 'mai raccolto' }, NOW)).toBe('error');
  });

  it('treats data without a timestamp as stale', () => {
    expect(deriveStatus({ ...base, fetchedAt: null }, NOW)).toBe('stale');
  });
});
