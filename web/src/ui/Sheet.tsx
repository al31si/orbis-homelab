import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { t } from '@/i18n';
import { cx } from '@/lib/cx';
import { IconButton } from './IconButton';
import styles from './Sheet.module.css';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Sticky area under the content, usually action buttons. */
  footer?: ReactNode;
  /** Width on wide screens (compact screens always use the full width). */
  size?: 'sm' | 'md' | 'lg';
}

const CLOSE_MS = 200;
const DISMISS_DISTANCE = 110;
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Bottom sheet on compact screens (drag the handle down to dismiss), centred modal from 700px.
 * Traps focus, closes on Esc/backdrop, locks page scroll and restores focus on close.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: SheetProps) {
  const [visible, setVisible] = useState(open);
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const drag = useRef<{ startY: number; offset: number } | null>(null);

  // Keep the sheet mounted long enough to play the exit animation.
  if (open && !visible) setVisible(true);
  const closing = !open && visible;
  useEffect(() => {
    if (open || !visible) return;
    const id = window.setTimeout(() => setVisible(false), CLOSE_MS);
    return () => window.clearTimeout(id);
  }, [open, visible]);

  // Scroll lock, inert background and focus management while visible.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const root = document.getElementById('root');
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    root?.setAttribute('inert', '');
    panel.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      root?.removeAttribute('inert');
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!visible) return null;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !panel.current) return;
    const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) {
      event.preventDefault();
    } else if (
      event.shiftKey &&
      (document.activeElement === first || document.activeElement === panel.current)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function setOffset(offset: number) {
    panel.current?.style.setProperty('--drag-y', `${offset}px`);
  }

  function onDragStart(event: PointerEvent<HTMLDivElement>) {
    drag.current = { startY: event.clientY, offset: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
    panel.current?.setAttribute('data-dragging', '');
  }

  function onDragMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    drag.current.offset = Math.max(0, event.clientY - drag.current.startY);
    setOffset(drag.current.offset);
  }

  function onDragEnd() {
    if (!drag.current) return;
    const { offset } = drag.current;
    drag.current = null;
    panel.current?.removeAttribute('data-dragging');
    if (offset > DISMISS_DISTANCE) onClose();
    setOffset(0);
  }

  return createPortal(
    <div className={cx(styles.root, closing && styles.closing)} data-size={size}>
      <div className={styles.backdrop} onClick={onClose} aria-hidden />
      <div
        ref={panel}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <div
          className={styles.handle}
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          aria-hidden
        >
          <span />
        </div>
        <header className={styles.header}>
          <div className={styles.heading}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className={styles.description}>
                {description}
              </p>
            )}
          </div>
          <IconButton
            icon="close"
            label={t('common.close')}
            variant="soft"
            iconSize={20}
            onClick={onClose}
          />
        </header>
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
