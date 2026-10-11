import { useApp } from '@/boot';
import { t } from '@/i18n';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { Page, PageHeader } from '@/ui/Page';

export default function NotFoundPage() {
  const app = useApp();
  return (
    <Page>
      <PageHeader title={t('more.notFound.title')} />
      <EmptyState
        icon="search"
        title={t('more.notFound.heading')}
        description={t('more.notFound.description', { name: app.name })}
        action={
          <Button variant="primary" href="/">
            {t('more.notFound.home')}
          </Button>
        }
      />
    </Page>
  );
}
