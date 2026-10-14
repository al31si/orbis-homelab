import { useApp, useFeatures } from '@/boot';
import { t } from '@/i18n';
import { usePush, type PushController } from '@/pwa/usePush';
import { Page, PageHeader } from '@/ui/Page';
import { AboutSection } from './more/AboutSection';
import { AppearanceSection } from './more/AppearanceSection';
import { ExtensionsSection } from './more/ExtensionsSection';
import { InstallSection } from './more/InstallSection';
import { NotificationsSection } from './more/NotificationsSection';
import { QuickLinksSection } from './more/QuickLinksSection';
import styles from './more/more.module.css';

/** Null when push is not enabled on the server: there is nothing to read or to turn on. */
function MoreContent({ push }: { push: PushController | null }) {
  const app = useApp();
  return (
    <Page width="narrow">
      <PageHeader title={t('more.title')} subtitle={t('more.subtitle', { name: app.name })} />
      <div className={styles.page}>
        <AppearanceSection />
        <InstallSection push={push?.state ?? null} />
        {push && <NotificationsSection push={push} />}
        <ExtensionsSection />
        <QuickLinksSection />
        <AboutSection />
      </div>
    </Page>
  );
}

/** One notification controller, so Installation and Notifications always agree. */
function MoreWithPush() {
  return <MoreContent push={usePush()} />;
}

export default function MorePage() {
  return useFeatures().push ? <MoreWithPush /> : <MoreContent push={null} />;
}
