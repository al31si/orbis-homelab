import { useApp } from '@/boot';
import { t } from '@/i18n';
import { resolveServiceUrl } from '@/lib/links';
import { Icon } from '@/ui/icons';
import { List, ListRow } from '@/ui/List';
import { Section } from '@/ui/Section';
import { ServiceIcon } from '@/ui/ServiceIcon';
import styles from './more.module.css';

/** Instance links from `config.yaml` (`links:`). The section disappears when there are none. */
export function QuickLinksSection() {
  const { links } = useApp();
  if (links.length === 0) return null;
  return (
    <Section title={t('more.links.title')}>
      <List aria-label={t('more.links.title')}>
        {links.map((link) => (
          <ListRow
            key={link.id}
            href={resolveServiceUrl(link.url) ?? undefined}
            leading={<ServiceIcon name={link.icon} iconUrl={link.iconUrl} size={36} />}
            title={link.title}
            subtitle={link.description || undefined}
            trailing={<Icon name="external-link" size={18} className={styles.external} />}
          />
        ))}
      </List>
    </Section>
  );
}
