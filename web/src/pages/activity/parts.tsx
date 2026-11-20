import type { ReactNode } from 'react';
import type { UiTone } from '@/lib/tone';
import styles from './activity.module.css';

/** The product behind a block: its logo and name, a detail line, and room for a state on the right. */
export function SourceHead({
  logo,
  name,
  detail,
  aside,
}: {
  logo: ReactNode;
  name: string;
  detail?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className={styles.sourceHead}>
      {logo}
      <div className={styles.sourceText}>
        <p className={styles.sourceName}>{name}</p>
        {detail && <p className={styles.sourceDetail}>{detail}</p>}
      </div>
      {aside}
    </div>
  );
}

/** A condensed numeral with a short caption under it. `tone` colours it only for a state. */
export function Figure({
  value,
  caption,
  tone,
  dim,
}: {
  value: string;
  caption: string;
  tone?: UiTone;
  /** Zero reads as "nothing here": quieter than a real value. */
  dim?: boolean;
}) {
  return (
    <span className={styles.figure} data-tone={tone} data-dim={dim || undefined}>
      <span className={styles.figureValue}>{value}</span>
      <span className={styles.figureCaption}>{caption}</span>
    </span>
  );
}
