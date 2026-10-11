import { useEffect, useRef, type ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { useShell } from '@/shell/ShellContext';
import styles from './Page.module.css';

export interface PageProps {
  children: ReactNode;
  /** Use `narrow` for forms and settings (max 720px) instead of the full 1200px content width. */
  width?: 'full' | 'narrow';
  className?: string;
}

/** Route content wrapper: page padding, max width, gentle fade-in on route change. */
export function Page({ children, width = 'full', className }: PageProps) {
  return (
    <div className={cx(styles.page, width === 'narrow' && styles.narrow, className)}>
      {children}
    </div>
  );
}

export interface PageHeaderProps {
  title: string;
  /** Muted line under the title. */
  subtitle?: ReactNode;
  /** Small label above the title (e.g. the date or hostname). */
  eyebrow?: ReactNode;
  /** Buttons aligned to the right on wide layouts. */
  actions?: ReactNode;
}

/**
 * The page's h1. On compact screens it is an iOS style large title that hands over to the
 * sticky header title when it scrolls out of view.
 */
export function PageHeader({ title, subtitle, eyebrow, actions }: PageHeaderProps) {
  const { setCollapsedTitle } = useShell();
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const element = heading.current;
    if (!element) return;
    let observer: IntersectionObserver | undefined;

    function observe() {
      observer?.disconnect();
      const header = document.querySelector('[data-app-header]');
      const top = header ? Math.round(header.getBoundingClientRect().bottom) : 0;
      observer = new IntersectionObserver(
        ([entry]) => setCollapsedTitle(entry?.isIntersecting ? null : title),
        { rootMargin: `-${top}px 0px 0px 0px` },
      );
      observer.observe(element as HTMLElement);
    }

    observe();
    // The header grows when the connection banner appears: re-measure.
    const headerResize = new ResizeObserver(observe);
    const header = document.querySelector('[data-app-header]');
    if (header) headerResize.observe(header);
    window.addEventListener('resize', observe);
    return () => {
      headerResize.disconnect();
      window.removeEventListener('resize', observe);
      observer?.disconnect();
      setCollapsedTitle(null);
    };
  }, [title, setCollapsedTitle]);

  return (
    <header className={styles.header}>
      <div className={styles.text}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h1 ref={heading} className={styles.title}>
          {title}
        </h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
