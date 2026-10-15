import { t } from '@/i18n';
import { cx } from '@/lib/cx';
import styles from './more.module.css';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name of the setting. */
  label: string;
}

/** On/off setting (`role="switch"`): a square slider with its state written next to it. */
export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={cx(styles.switch, checked && styles.switchOn)}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.switchState}>
        {checked ? t('more.switch.on') : t('more.switch.off')}
      </span>
      <span className={styles.switchTrack} aria-hidden>
        <span className={styles.switchThumb} />
      </span>
    </button>
  );
}
