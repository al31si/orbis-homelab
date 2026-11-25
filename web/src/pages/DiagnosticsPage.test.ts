import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Router } from 'wouter';
import type { Diagnostics } from '@shared/api';
import { useSnapshot } from '@/data';
import { setLanguage, t } from '@/i18n';
import DiagnosticsPage from './DiagnosticsPage';

vi.mock('@/boot', () => ({
  useApp: () => ({ name: 'Orbis' }),
  useFeatures: () => ({ containers: true }),
}));
vi.mock('@/data', () => ({ useSnapshot: vi.fn() }));
vi.mock('@/shell/ShellContext', () => ({ useShell: () => ({ setCollapsedTitle: vi.fn() }) }));
vi.mock('@/pwa/useClientInfo', () => ({
  useClientInfo: () => ({
    serviceWorker: 'active',
    buildId: 'test-build',
    displayMode: 'standalone',
    standalone: true,
    secureContext: true,
    online: true,
    viewport: {
      innerWidth: 393,
      innerHeight: 852,
      screenWidth: 393,
      screenHeight: 852,
      safeAreaInsets: { top: 59, bottom: 34 },
    },
  }),
}));

const data: Diagnostics = {
  version: 'test-version',
  startedAt: '2026-11-25T08:00:00Z',
  uptimeSeconds: 60,
  nodeVersion: 'v22',
  sources: [],
  catalog: { services: 0, containersUnclassified: [] },
  push: { enabled: false, subscriptions: 0 },
  extensions: [],
};

beforeEach(() => setLanguage('en'));

describe('device diagnostics', () => {
  it.each(['ready', 'stale', 'loading', 'offline', 'error'] as const)(
    'shows local measurements before server content when the snapshot is %s',
    (status) => {
      const hasData = status === 'ready' || status === 'stale';
      vi.mocked(useSnapshot).mockReturnValue({
        data: hasData ? data : null,
        status,
        fetchedAt: hasData ? Date.now() : null,
        error: status === 'error' ? 'Server failed' : null,
        refreshing: status === 'loading',
        intervalMs: 10_000,
        refresh: vi.fn(),
      });

      const html = renderToStaticMarkup(
        createElement(Router, {
          ssrPath: '/more/diagnostics',
          children: createElement(DiagnosticsPage),
        }),
      );
      expect(html).toContain('393 × 852 (screen 393 × 852)');
      expect(html).toContain('Safe-area insets');
      expect(html).toContain('top 59 · bottom 34');
      expect(html).not.toContain('Height correction');
      const deviceHeading = html.indexOf('This device');
      expect(deviceHeading).toBeGreaterThan(-1);
      if (hasData) {
        expect(deviceHeading).toBeLessThan(html.indexOf('Data sources'));
        expect(deviceHeading).toBeLessThan(html.indexOf('>Server<'));
        expect(html).toContain('test-version');
      } else if (status === 'loading') {
        expect(deviceHeading).toBeLessThan(html.indexOf('aria-busy="true"'));
      } else {
        const fallback =
          status === 'offline'
            ? t('diagnostics.offline.title', { name: 'Orbis' })
            : t('ui.errorState.title');
        expect(html).toContain(fallback);
        expect(deviceHeading).toBeLessThan(html.indexOf(fallback));
      }
    },
  );
});
