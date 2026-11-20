import { useEffect, useRef, useState, type ReactNode } from 'react';
import { t } from '@/i18n';
import { useShell } from '@/shell/ShellContext';
import styles from './PullToRefresh.module.css';
import { Icon } from './icons';

export interface PullToRefreshProps {
  /** Should resolve when the refresh is done; the spinner stays until then (at least 600ms). */
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

const THRESHOLD = 64;
const MAX_PULL = 110;
const RESISTANCE = 0.45;
const MIN_SPIN_MS = 600;

/**
 * Touch pull-to-refresh for installed PWAs, where iOS has no native gesture. Only reacts to a
 * downward drag that starts while the page is scrolled to the very top.
 */
export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const { scroller } = useShell();
  const refreshRef = useRef(onRefresh);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    let startY: number | null = null;
    let distance = 0;
    let busy = false;

    const scrollTop = () => scroller.current?.scrollTop ?? 0;

    function onStart(event: TouchEvent) {
      const touch = event.touches[0];
      const blocked = document.body.style.overflow === 'hidden';
      startY =
        !busy && !blocked && event.touches.length === 1 && scrollTop() <= 0 && touch
          ? touch.clientY
          : null;
      distance = 0;
    }

    function onMove(event: TouchEvent) {
      const touch = event.touches[0];
      if (startY === null || !touch) return;
      const delta = touch.clientY - startY;
      if (delta <= 0 || scrollTop() > 0) {
        if (distance > 0) setPull(0);
        distance = 0;
        return;
      }
      if (event.cancelable) event.preventDefault();
      distance = Math.min(MAX_PULL, delta * RESISTANCE);
      setDragging(true);
      setPull(distance);
    }

    async function onEnd() {
      if (startY === null) return;
      startY = null;
      setDragging(false);
      if (distance < THRESHOLD) {
        setPull(0);
        return;
      }
      busy = true;
      setRefreshing(true);
      setPull(THRESHOLD * 0.8);
      const started = Date.now();
      try {
        await refreshRef.current();
      } finally {
        const wait = Math.max(0, MIN_SPIN_MS - (Date.now() - started));
        window.setTimeout(() => {
          busy = false;
          setRefreshing(false);
          setPull(0);
        }, wait);
      }
    }

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', onEnd);
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onEnd);
    };
  }, [scroller]);

  const progress = Math.min(1, pull / THRESHOLD);
  return (
    <div
      className={styles.wrap}
      data-dragging={dragging || undefined}
      style={pull > 0 ? { transform: `translateY(${pull}px)` } : undefined}
    >
      <div
        className={styles.indicator}
        aria-hidden={!refreshing}
        role={refreshing ? 'status' : undefined}
      >
        <span
          className={styles.spinner}
          data-spinning={refreshing || undefined}
          style={{
            opacity: progress,
            transform: refreshing ? undefined : `rotate(${progress * 270}deg)`,
          }}
        >
          <Icon name="refresh" size={20} />
        </span>
        {refreshing && <span className="sr-only">{t('ui.pullToRefresh.refreshing')}</span>}
      </div>
      {children}
    </div>
  );
}
