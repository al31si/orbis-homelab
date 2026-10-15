import { useApp } from '@/boot';
import { t } from '@/i18n';
import { resolveServiceUrl } from '@/lib/links';
import { Section } from '@/ui/Section';
import { ServiceIcon } from '@/ui/ServiceIcon';
import { Row, Rows } from './rows';

/** Instance links from `config.yaml` (`links:`). The section disappears when there are none. */
export function QuickLinksSection() {
  const { links } = useApp();
  if (links.length === 0) return null;
  return (
    <Section title={t('more.links.title')}>
      <Rows label={t('more.links.title')}>
        {links.map((link) => (
          <Row
            key={link.id}
            href={resolveServiceUrl(link.url) ?? undefined}
            leading={
              <ServiceIcon name={link.icon} iconUrl={link.iconUrl} label={link.title} size={36} />
            }
            title={link.title}
            help={link.description || undefined}
          />
        ))}
      </Rows>
    </Section>
  );
}
