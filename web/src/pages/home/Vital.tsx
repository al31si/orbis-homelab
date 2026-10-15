import { useT } from '@/i18n';
import type { UiTone } from '@/lib/tone';
import { AppLink } from '@/ui/AppLink';
import { StatusDot } from '@/ui/Badge';
import { Icon, type IconName } from '@/ui/icons';
import { ProgressBar } from '@/ui/ProgressBar';
import styles from './home.module.css';

export interface VitalProps {
  label: string;
  icon: IconName;
  /** Internal page with the full picture. */
  href: string;
  /** The figure, already formatted. */
  value: string;
  unit?: string;
  /** One short line under the meter. */
  detail?: string;
  tone: UiTone;
  /** 0..100 fill of the LED meter; omitted when there is no reading. */
  meter?: number;
}

/** One instrument of the panel: label, condensed figure, LED meter, one line of detail. */
export function Vital({ label, icon, href, value, unit, detail, tone, meter }: VitalProps) {
  const t = useT();
  return (
    <AppLink href={href} className={styles.vital} data-tone={tone}>
      <span className={styles.vitalHead}>
        <Icon name={icon} size={16} />
        <span className={styles.vitalLabel}>{label}</span>
        {(tone === 'warn' || tone === 'crit') && (
          <StatusDot
            tone={tone}
            label={tone === 'crit' ? t('home.vitals.critical') : t('home.vitals.high')}
          />
        )}
      </span>
      <span className={styles.vitalFigure}>
        <span className={styles.vitalValue}>{value}</span>
        {unit && <span className={styles.vitalUnit}>{unit}</span>}
      </span>
      {meter !== undefined && <ProgressBar value={meter} tone={tone} label={label} />}
      {detail && <span className={styles.vitalDetail}>{detail}</span>}
    </AppLink>
  );
}
