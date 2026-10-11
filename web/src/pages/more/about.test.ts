import { describe, expect, it } from 'vitest';
import { t } from '@/i18n';
import { accessSummary } from './about';

describe('accessSummary', () => {
  it('describes full access with the mode and the signed-in user', () => {
    const summary = accessSummary({
      access: 'full',
      accessMode: 'identity-proxy',
      user: { login: 'jane', name: 'Jane Doe' },
    });
    expect(summary.label).toBe(t('more.about.accessFull'));
    expect(summary.details).toEqual([t('more.about.mode.identity-proxy'), 'Jane Doe']);
  });

  it('falls back to the login when the user has no display name', () => {
    const summary = accessSummary({
      access: 'full',
      accessMode: 'identity-proxy',
      user: { login: 'jane', name: null },
    });
    expect(summary.details).toContain('jane');
  });

  it('says what limited access withholds', () => {
    const summary = accessSummary({ access: 'limited', accessMode: 'limited', user: null });
    expect(summary.label).toBe(t('more.about.accessLimited'));
    expect(summary.details).toEqual([
      t('more.about.mode.limited'),
      t('more.about.accessLimitedHint'),
    ]);
  });

  it('has no user line on a trusted network', () => {
    const summary = accessSummary({ access: 'full', accessMode: 'trusted-network', user: null });
    expect(summary.details).toEqual([t('more.about.mode.trusted-network')]);
  });
});
