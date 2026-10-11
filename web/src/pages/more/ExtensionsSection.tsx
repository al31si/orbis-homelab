import { useExtensionPages } from '@/extensions';
import { t } from '@/i18n';
import { Icon, resolveIconName } from '@/ui/icons';
import { List, ListRow } from '@/ui/List';
import { Section } from '@/ui/Section';

/** Pages contributed by extensions that ask to be listed in Settings. */
export function ExtensionsSection() {
  const pages = useExtensionPages().filter((page) => page.listIn.includes('more'));
  if (pages.length === 0) return null;
  return (
    <Section title={t('more.extensions.title')}>
      <List aria-label={t('more.extensions.title')}>
        {pages.map((page) => (
          <ListRow
            key={page.path}
            href={page.path}
            leading={<Icon name={resolveIconName(page.icon)} size={20} />}
            title={page.title}
            subtitle={page.description || undefined}
          />
        ))}
      </List>
    </Section>
  );
}
