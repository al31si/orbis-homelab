import { t } from '@/i18n';
import { setPrefs, usePrefs, type ThemePref } from '@/lib/prefs';
import { Card } from '@/ui/Card';
import { Section } from '@/ui/Section';
import { Segmented } from '@/ui/Segmented';
import { Switch } from './Switch';
import styles from './more.module.css';

export function AppearanceSection() {
  const prefs = usePrefs();
  const themeOptions: { value: ThemePref; label: string }[] = [
    { value: 'auto', label: t('more.appearance.themeAuto') },
    { value: 'light', label: t('more.appearance.themeLight') },
    { value: 'dark', label: t('more.appearance.themeDark') },
  ];
  return (
    <Section title={t('more.appearance.title')}>
      <Card padding="none">
        <div className={styles.block}>
          <div className={styles.rowText}>
            <p className={styles.rowTitle}>{t('more.appearance.theme')}</p>
            <p className={styles.rowSub}>{t('more.appearance.themeHint')}</p>
          </div>
          <Segmented
            options={themeOptions}
            value={prefs.theme}
            onChange={(theme) => setPrefs({ theme })}
            ariaLabel={t('more.appearance.theme')}
            fullWidth
          />
        </div>
        <div className={styles.row}>
          <div className={styles.rowText}>
            <p className={styles.rowTitle}>{t('more.appearance.showNoUi')}</p>
            <p className={styles.rowSub}>{t('more.appearance.showNoUiHint')}</p>
          </div>
          <Switch
            label={t('more.appearance.showNoUi')}
            checked={prefs.showServicesWithoutUi}
            onChange={(showServicesWithoutUi) => setPrefs({ showServicesWithoutUi })}
          />
        </div>
      </Card>
    </Section>
  );
}
