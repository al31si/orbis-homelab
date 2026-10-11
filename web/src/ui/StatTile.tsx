import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import type { UiTone } from '@/lib/tone';
import { AppLink } from './AppLink';
import { Icon, type IconName } from './icons';
import { ProgressBar } from './ProgressBar';
import { Sparkline } from './Sparkline';
import styles from './StatTile.module.css';

export interface StatTileProps {
  label: string;
  /** Main figure, already formatted ("37", "8,2"). */
  value: ReactNode;
  /** Unit rendered smaller next to the value ("%", "°C", "TB"). */
  unit?: string;
  /** One line under the figure ("4 core · load 0,8"). */
  detail?: ReactNode;
  icon?: IconName;
  tone?: UiTone;
  /** Trend values, oldest first; drawn as a sparkline when there are at least two. */
  spark?: readonly number[];
  sparkMin?: number;
  sparkMax?: number;
  /** 0..100 usage bar (used when there is no history). */
  progress?: number;
  /** Makes the whole tile a link to an internal page. */
  href?: string;
  className?: string;
}

/** Compact vital: label, big number, and either a sparkline or a usage bar. */
export function StatTile({
  label,
  value,
  unit,
  detail,
  icon,
  tone = 'neutral',
  spark,
  sparkMin,
  sparkMax,
  progress,
  href,
  className,
}: StatTileProps) {
  const body = (
    <>
      <span className={styles.head}>
        {icon && <Icon name={icon} size={16} />}
        <span className={styles.label}>{label}</span>
        {tone !== 'neutral' && <span className={styles.toneDot} aria-hidden />}
      </span>
      <span className={styles.figure}>
        <span className={styles.value}>{value}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </span>
      {detail && <span className={styles.detail}>{detail}</span>}
      <span className={styles.visual}>
        {spark && spark.length >= 2 ? (
          <Sparkline
            values={spark}
            tone={tone === 'neutral' ? 'info' : tone}
            min={sparkMin}
            max={sparkMax}
            height={30}
          />
        ) : progress !== undefined ? (
          <ProgressBar
            value={progress}
            label={label}
            size="sm"
            tone={tone === 'neutral' ? 'info' : tone}
          />
        ) : null}
      </span>
    </>
  );
  const classes = cx(styles.tile, href && styles.link, className);
  return href ? (
    <AppLink href={href} className={classes} data-tone={tone}>
      {body}
    </AppLink>
  ) : (
    <div className={classes} data-tone={tone}>
      {body}
    </div>
  );
}
