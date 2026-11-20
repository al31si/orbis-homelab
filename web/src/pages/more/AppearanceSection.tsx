import { t } from '@/i18n';
import { setPrefs, usePrefs, type ThemePref } from '@/lib/prefs';
import { Section } from '@/ui/Section';
import { Segmented } from '@/ui/Segmented';
import { Row, Rows } from './rows';
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
      <Rows>
        <Row
          wideControl
          title={t('more.appearance.theme')}
          help={t('more.appearance.themeHint')}
          trailing={
            <div className={styles.theme}>
              <Segmented
                options={themeOptions}
                value={prefs.theme}
                onChange={(theme) => setPrefs({ theme })}
                ariaLabel={t('more.appearance.theme')}
                fullWidth
              />
            </div>
          }
        />
        <Row
          title={t('more.appearance.showNoUi')}
          help={t('more.appearance.showNoUiHint')}
          trailing={
            <Switch
              label={t('more.appearance.showNoUi')}
              checked={prefs.showServicesWithoutUi}
              onChange={(showServicesWithoutUi) => setPrefs({ showServicesWithoutUi })}
            />
          }
        />
      </Rows>
    </Section>
  );
}
