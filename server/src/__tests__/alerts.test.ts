import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AlertEngine, type AlertState } from '../alerts.js';
import type { AlertNotification } from '../core/types.js';
import { JsonStore } from '../lib/store.js';
import { createTranslator } from '../i18n/index.js';
import type { Candidate } from '../rules.js';

const cand = (over: Partial<Candidate> = {}): Candidate => ({
  id: 'disk:A',
  severity: 'critical',
  source: 'storage',
  title: 'Disco critico',
  detail: 'x',
  serviceId: null,
  ...over,
});

async function engine(graceMs = 90_000) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'acc-'));
  const store = await JsonStore.open<AlertState>(path.join(dir, 'state.json'), {
    alerts: {},
    events: [],
  });
  const sent: AlertNotification[] = [];
  return {
    e: new AlertEngine(store, graceMs, (n) => sent.push(n), createTranslator('en')),
    sent,
    store,
    dir,
  };
}

describe('AlertEngine', () => {
  it('raises only after the grace period and keeps the first-seen time', async () => {
    const { e } = await engine();
    e.evaluate([cand()], 1_000);
    expect(e.active()).toHaveLength(0);
    e.evaluate([cand()], 91_000);
    const [alert] = e.active();
    expect(alert?.since).toBe(new Date(1_000).toISOString());
  });

  it('drops a blip shorter than the grace period without any event', async () => {
    const { e, sent } = await engine();
    e.evaluate([cand()], 1_000);
    e.evaluate([], 30_000);
    e.evaluate([cand()], 100_000);
    expect(e.active()).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it('notifies once when a critical alert is raised and once when it clears', async () => {
    const { e, sent } = await engine(0);
    e.evaluate([cand()], 1_000);
    e.evaluate([cand()], 2_000);
    e.evaluate([], 3_000);
    expect(sent.map((n) => n.kind)).toEqual(['raised', 'cleared']);
  });

  it('does not push warnings, but notifies when a warning escalates to critical', async () => {
    const { e, sent } = await engine(0);
    e.evaluate([cand({ severity: 'warning' })], 1_000);
    expect(sent).toHaveLength(0);
    e.evaluate([cand({ severity: 'critical' })], 2_000);
    expect(sent.map((n) => n.kind)).toEqual(['raised']);
  });

  it('persists alerts so `since` survives a restart', async () => {
    const { e, store, dir } = await engine(0);
    e.evaluate([cand()], 5_000);
    await store.flush();
    const reopened = await JsonStore.open<AlertState>(path.join(dir, 'state.json'), {
      alerts: {},
      events: [],
    });
    const e2 = new AlertEngine(reopened, 0, () => undefined, createTranslator('en'));
    expect(e2.active()[0]?.since).toBe(new Date(5_000).toISOString());
  });

  it('orders active alerts critical first', async () => {
    const { e } = await engine(0);
    e.evaluate([cand({ id: 'w', severity: 'warning' }), cand({ id: 'c' })], 1_000);
    expect(e.active().map((a) => a.id)).toEqual(['c', 'w']);
  });
});
