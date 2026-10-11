import { useApp, useFeatures } from '@/boot';
import { t } from '@/i18n';
import { Page, PageHeader } from '@/ui/Page';
import { AboutSection } from './more/AboutSection';
import { AppearanceSection } from './more/AppearanceSection';
import { ExtensionsSection } from './more/ExtensionsSection';
import { InstallSection } from './more/InstallSection';
import { NotificationsSection } from './more/NotificationsSection';
import { QuickLinksSection } from './more/QuickLinksSection';
import styles from './more/more.module.css';

export default function MorePage() {
  const app = useApp();
  const features = useFeatures();
  return (
    <Page width="narrow">
      <PageHeader title={t('more.title')} subtitle={t('more.subtitle', { name: app.name })} />
      <div className={styles.page}>
        <AppearanceSection />
        <InstallSection />
        {features.push && <NotificationsSection />}
        <ExtensionsSection />
        <QuickLinksSection />
        <AboutSection />
      </div>
    </Page>
  );
}
