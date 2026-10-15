import type { CSSProperties } from 'react';
import { cx } from '@/lib/cx';
import type { UiTone } from '@/lib/tone';
import styles from './ledStack.module.css';

/** How a part is lit: full tone, dimmed tone, neutral, or dark (the unused part of a whole). */
export type LedKind = 'on' | 'dim' | 'aux' | 'off';

const COLOR: Record<LedKind, string> = {
  on: 'var(--tone)',
  dim: 'color-mix(in srgb, var(--tone) 42%, var(--lamp-off))',
  aux: 'var(--text-2)',
  off: 'var(--lamp-off)',
};

export interface LedSegment {
  id: string;
  value: number;
  kind: LedKind;
  /** Plain-text description used in the accessible name ("User 31,4%"). */
  text: string;
}

export interface LedStackProps {
  segments: readonly LedSegment[];
  /** What a full row stands for. */
  total: number;
  /** Tone of the `on` and `dim` cells. */
  tone: UiTone;
  /** Accessible name of the meter. */
  label: string;
  /** Number of LED cells (default 40). */
  cells?: number;
  className?: string;
}

/**
 * The LED meter with its row split into parts (user/system/I/O wait, used/cache/free), lit from
 * the left like `ProgressBar`. Parts are rounded to whole cells.
 */
export function LedStack({ segments, total, tone, label, cells = 40, className }: LedStackProps) {
  const stops: string[] = [];
  let sum = 0;
  let from = 0;
  for (const segment of segments) {
    sum += Math.max(0, segment.value);
    const to = total > 0 ? Math.min(cells, Math.round((sum / total) * cells)) : 0;
    if (to > from) {
      stops.push(`${COLOR[segment.kind]} ${(from / cells) * 100}% ${(to / cells) * 100}%`);
      from = to;
    }
  }
  // Anything measurable shows at least one lit cell, like `ProgressBar`.
  const first = segments[0];
  if (from === 0 && sum > 0 && first) {
    stops.push(`${COLOR[first.kind]} 0% ${100 / cells}%`);
    from = 1;
  }
  stops.push(`var(--lamp-off) ${(from / cells) * 100}% 100%`);

  const style = {
    '--cells': cells,
    background: `linear-gradient(90deg, ${stops.join(', ')})`,
  } as CSSProperties;
  return (
    <div
      className={cx(styles.track, className)}
      style={style}
      role="img"
      aria-label={`${label}: ${segments.map((segment) => segment.text).join(', ')}`}
      data-tone={tone}
    />
  );
}

export interface LedLegendItem {
  id: string;
  kind: LedKind;
  label: string;
  /** Formatted figure shown on the right. */
  value: string;
}

export interface LedLegendProps {
  items: readonly LedLegendItem[];
  /** Same tone as the meter: `on` and `dim` swatches follow it. */
  tone: UiTone;
  className?: string;
}

/** The key of a `LedStack`: a swatch, the name and the figure of each part. */
export function LedLegend({ items, tone, className }: LedLegendProps) {
  return (
    <dl className={cx(styles.legend, className)} data-tone={tone}>
      {items.map((item) => (
        <div key={item.id} className={styles.legendRow}>
          <dt>
            <span
              className={styles.swatch}
              data-kind={item.kind}
              style={{ background: COLOR[item.kind] }}
              aria-hidden
            />
            {item.label}
          </dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
