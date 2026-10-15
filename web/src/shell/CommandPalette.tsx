import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'wouter';
import type { CategoryInfo, ServiceView } from '@shared/api';
import { useApp } from '@/boot';
import { useRefreshAll, useSnapshot } from '@/data';
import { useExtensionPages } from '@/extensions';
import { t } from '@/i18n';
import { cx } from '@/lib/cx';
import { resolveServiceUrl } from '@/lib/links';
import { setPrefs, usePrefs, type ThemePref } from '@/lib/prefs';
import { toneForServiceState } from '@/lib/tone';
import { categoryLabel, serviceStateLabel } from '@/pages/services/catalog';
import { useCopyAddress } from '@/pages/services/useCopyAddress';
import { StatusDot } from '@/ui/Badge';
import { Icon, type IconName } from '@/ui/icons';
import { ServiceIcon } from '@/ui/ServiceIcon';
import { useToast } from '@/ui/Toast';
import { SETTINGS_ITEM } from './navItems';
import { useNavItems } from './useNavItems';
import { arrangeResults, pushRecent, type PaletteGroup, type PaletteItem } from './paletteModel';
import { loadRecents, saveRecents } from './paletteRecents';
import styles from './CommandPalette.module.css';

const FOCUSABLE = 'input, button:not([disabled]):not([tabindex="-1"])';

const THEME_ORDER: readonly ThemePref[] = ['auto', 'light', 'dark'];
const themeLabel = (theme: ThemePref): string => t(`palette.theme.${theme}`);

const PAGE_KEYWORDS = {
  '/': 'palette.keywords.home',
  '/services': 'palette.keywords.services',
  '/system': 'palette.keywords.system',
  '/storage': 'palette.keywords.storage',
  '/activity': 'palette.keywords.activity',
  '/more': 'palette.keywords.settings',
} as const;

const words = (text: string): string[] => text.split(/\s+/).filter(Boolean);

function serviceItem(service: ServiceView, categories: readonly CategoryInfo[]): PaletteItem {
  const url = resolveServiceUrl(service.url);
  return {
    id: `service:${service.id}`,
    group: 'services',
    title: service.name,
    subtitle:
      service.state === 'up' && service.monitored
        ? service.description
        : [serviceStateLabel(service), service.description].filter(Boolean).join(', '),
    keywords: [
      service.description,
      categoryLabel(service.category, categories) ?? '',
      service.id,
    ].filter(Boolean),
    icon: { kind: 'service', name: service.icon },
    serviceId: service.id,
    state: service.state,
    externalUrl: url ?? undefined,
  };
}

const isApple = /Mac|iPhone|iPad/.test(navigator.userAgent);
const MODIFIER_LABEL = isApple ? '⌘' : 'Ctrl';

/**
 * Global search and commands: services (detail or external launch), pages and actions. A
 * full-screen sheet on compact screens, a centred dialog from 700px. Mount it only while open.
 */
export function CommandPalette({ onClose }: { onClose: () => void }) {
  const services = useSnapshot('services').data;
  const { id: appId, categories } = useApp();
  const navItems = useNavItems();
  const extensionPages = useExtensionPages();
  const { favorites, theme } = usePrefs();
  const [, navigate] = useLocation();
  const refreshAll = useRefreshAll();
  const toast = useToast();
  const copyAddress = useCopyAddress();

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [recents, setRecents] = useState(() => loadRecents(appId));
  const [copyServiceId, setCopyServiceId] = useState<string | null>(null);

  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const listId = useId();
  const optionId = (index: number) => `${listId}-option-${index}`;

  const pages = useMemo<PaletteItem[]>(
    () => [
      ...[...navItems, SETTINGS_ITEM].map((nav): PaletteItem => {
        const keywords = PAGE_KEYWORDS[nav.path as keyof typeof PAGE_KEYWORDS];
        return {
          id: `page:${nav.path}`,
          group: 'pages',
          title: t(nav.labelKey),
          keywords: keywords ? words(t(keywords)) : undefined,
          icon: { kind: 'icon', name: nav.icon },
        };
      }),
      {
        id: 'page:/more/diagnostics',
        group: 'pages',
        title: t('palette.page.diagnostics'),
        keywords: words(t('palette.keywords.diagnostics')),
        icon: { kind: 'icon', name: 'wrench' },
      },
      ...extensionPages
        .filter((page) => page.listIn.includes('palette'))
        .map((page): PaletteItem => ({
          id: `page:${page.path}`,
          group: 'pages',
          title: page.title,
          subtitle: page.description,
          icon: { kind: 'icon', name: page.icon as IconName },
        })),
    ],
    [navItems, extensionPages],
  );

  const baseItems = useMemo<PaletteItem[]>(
    () => [
      ...(services ?? []).map((service) => serviceItem(service, categories)),
      ...pages,
      {
        id: 'action:refresh',
        group: 'actions',
        title: t('palette.action.refresh'),
        keywords: words(t('palette.action.refreshKeywords')),
        icon: { kind: 'icon', name: 'refresh' },
      },
      {
        id: 'action:theme',
        group: 'actions',
        title: t('palette.action.theme'),
        subtitle: t('palette.action.themeCurrent', { theme: themeLabel(theme) }),
        keywords: words(t('palette.action.themeKeywords')),
        icon: { kind: 'icon', name: 'moon' },
      },
    ],
    [services, categories, pages, theme],
  );

  // "Copy address" follows the service last highlighted, else the best service match, else
  // the latest recent or favorite service that can be opened.
  const context = { recentIds: recents, favoriteIds: favorites };
  const launchable = baseItems.filter((item) => item.serviceId && item.externalUrl);
  const copyTarget =
    launchable.find((item) => item.serviceId === copyServiceId) ??
    arrangeResults(query, baseItems, context)
      .flatMap((group) => group.items)
      .find((item) => item.serviceId && item.externalUrl) ??
    recents
      .map((id) => launchable.find((item) => item.id === id))
      .find((item) => item !== undefined) ??
    launchable.find((item) => favorites.includes(item.serviceId ?? ''));
  const groups: PaletteGroup[] = arrangeResults(
    query,
    copyTarget
      ? [
          ...baseItems,
          {
            id: 'action:copy',
            group: 'actions',
            title: t('palette.action.copy', { name: copyTarget.title }),
            keywords: words(t('palette.action.copyKeywords')),
            icon: { kind: 'icon', name: 'copy' },
          },
        ]
      : baseItems,
    context,
  );
  const rows = groups.flatMap((group) => group.items);
  const activeIndex = Math.min(active, rows.length - 1);
  const activeItem = rows[activeIndex];

  if (activeItem?.externalUrl && activeItem.serviceId !== copyServiceId) {
    setCopyServiceId(activeItem.serviceId ?? null);
  }

  // Focus, scroll lock and inert background while open; focus goes back to the opener.
  useLayoutEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const app = document.getElementById('root');
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    app?.setAttribute('inert', '');
    input.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = overflow;
      app?.removeAttribute('inert');
      opener?.focus?.();
    };
  }, []);

  // On iOS the keyboard shrinks the visual viewport only: follow it so results stay reachable.
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    function sync() {
      if (!viewport) return;
      root.current?.style.setProperty('--vv-top', `${viewport.offsetTop}px`);
      root.current?.style.setProperty('--vv-height', `${viewport.height}px`);
    }
    sync();
    viewport.addEventListener('resize', sync);
    viewport.addEventListener('scroll', sync);
    return () => {
      viewport.removeEventListener('resize', sync);
      viewport.removeEventListener('scroll', sync);
    };
  }, []);

  useEffect(() => {
    if (activeIndex === 0) results.current?.scrollTo({ top: 0 });
    else {
      document
        .getElementById(`${listId}-option-${activeIndex}`)
        ?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, query, listId]);

  function choose(item: PaletteItem, external: boolean) {
    onClose();
    if (item.group !== 'actions') {
      const next = pushRecent(recents, item.id);
      setRecents(next);
      saveRecents(appId, next);
    }
    if (item.serviceId) {
      if (external && item.externalUrl) {
        window.open(item.externalUrl, '_blank', 'noopener,noreferrer');
      } else {
        navigate(`/services/${encodeURIComponent(item.serviceId)}`);
      }
    } else if (item.id.startsWith('page:')) {
      navigate(item.id.slice('page:'.length));
    } else if (item.id === 'action:refresh') {
      void refreshAll().then(() =>
        toast.show({ message: t('palette.action.refreshed'), tone: 'ok' }),
      );
    } else if (item.id === 'action:theme') {
      const next = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length] ?? 'auto';
      setPrefs({ theme: next });
      toast.show({
        id: 'theme',
        message: t('palette.action.themeChanged', { theme: themeLabel(next) }),
        tone: 'info',
      });
    } else if (item.id === 'action:copy' && copyTarget?.serviceId) {
      const service = services?.find((candidate) => candidate.id === copyTarget.serviceId);
      if (service) void copyAddress(service);
    }
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (rows.length === 0) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((activeIndex + step + rows.length) % rows.length);
    } else if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (activeItem) choose(activeItem, event.metaKey || event.ctrlKey);
    }
  }

  function onPanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !panel.current) return;
    const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (element) => element.getClientRects().length > 0,
    );
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div ref={root} className={styles.root}>
      <div className={styles.backdrop} onClick={onClose} aria-hidden />
      <div
        ref={panel}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={t('palette.dialog')}
        onKeyDown={onPanelKeyDown}
      >
        <div className={styles.bar}>
          <div className={styles.field}>
            <Icon name="search" size={20} className={styles.barIcon} />
            <input
              ref={input}
              className={styles.input}
              type="text"
              role="combobox"
              aria-expanded={rows.length > 0}
              aria-controls={listId}
              aria-activedescendant={activeItem ? optionId(activeIndex) : undefined}
              aria-autocomplete="list"
              aria-label={t('palette.inputLabel')}
              placeholder={t('palette.placeholder')}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
                setCopyServiceId(null);
              }}
              onKeyDown={onInputKeyDown}
              enterKeyHint="go"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <kbd className={styles.esc} aria-hidden>
              esc
            </kbd>
          </div>
          <button type="button" className={styles.cancel} onClick={onClose}>
            {t('palette.cancel')}
          </button>
        </div>

        <div ref={results} className={styles.results}>
          {rows.length === 0 ? (
            <p className={styles.none} role="status">
              {t('palette.none', { query: query.trim() })}
            </p>
          ) : (
            <div
              id={listId}
              role="listbox"
              aria-label={t('palette.resultsLabel')}
              className={styles.list}
            >
              {groups.map((group, groupIndex) => {
                const start = groups
                  .slice(0, groupIndex)
                  .reduce((count, previous) => count + previous.items.length, 0);
                const headingId = `${listId}-group-${group.id}`;
                return (
                  <div key={group.id} role="group" aria-labelledby={headingId}>
                    <h2 id={headingId} className={styles.groupTitle}>
                      {t(`palette.group.${group.id}`)}
                    </h2>
                    <div className={styles.group}>
                      {group.items.map((item, position) => {
                        const index = start + position;
                        return (
                          <div key={item.id} className={styles.rowWrap}>
                            <div
                              id={optionId(index)}
                              role="option"
                              aria-selected={index === activeIndex}
                              className={cx(
                                styles.row,
                                index === activeIndex && styles.active,
                                item.externalUrl && styles.hasExternal,
                              )}
                              onClick={() => choose(item, false)}
                              onMouseMove={() => index !== activeIndex && setActive(index)}
                            >
                              {item.icon.kind === 'service' ? (
                                <ServiceIcon
                                  name={item.icon.name}
                                  label={item.title}
                                  serviceId={item.serviceId}
                                  size={36}
                                />
                              ) : (
                                <span className={styles.glyph}>
                                  <Icon name={item.icon.name} size={20} />
                                </span>
                              )}
                              <span className={styles.text}>
                                <span className={styles.title}>
                                  <span className={styles.titleText}>{item.title}</span>
                                  {item.state && (
                                    <StatusDot tone={toneForServiceState(item.state)} />
                                  )}
                                </span>
                                {item.subtitle && (
                                  <span className={styles.subtitle}>{item.subtitle}</span>
                                )}
                              </span>
                            </div>
                            {item.externalUrl && (
                              <button
                                type="button"
                                className={styles.external}
                                tabIndex={-1}
                                aria-label={t('palette.open.label', { name: item.title })}
                                title={t('palette.open.title', { shortcut: MODIFIER_LABEL })}
                                onClick={() => choose(item, true)}
                              >
                                <Icon name="external-link" size={20} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <footer className={styles.hints} aria-hidden>
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> {t('palette.hint.navigate')}
          </span>
          <span>
            <kbd>{t('palette.key.enter')}</kbd> {t('palette.hint.open')}
          </span>
          <span>
            <kbd>{MODIFIER_LABEL}</kbd>
            <kbd>{t('palette.key.enter')}</kbd> {t('palette.hint.openService')}
          </span>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
