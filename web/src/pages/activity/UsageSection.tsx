import type { QuotaInfo, UsageEntry } from '@shared/api';
import { t } from '@/i18n';
import { formatNumber, formatRelativeTime } from '@/lib/format';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/icons';
import { Ring } from '@/ui/Ring';
import { Section } from '@/ui/Section';
import { formatResetMoment, quotaTone, usageState } from './derive';
import { SnapshotSection } from './SnapshotSection';
import styles from './activity.module.css';

function QuotaCard({ label, data }: { label: string; data: QuotaInfo }) {
  const remaining = Math.round(data.weekly.remainingPercent);
  return (
    <Card className={styles.quota}>
      <Ring
        value={remaining}
        tone={quotaTone(remaining)}
        size={72}
        stroke={8}
        label={t('activity.usage.ringLabel', { label, percent: remaining })}
      >
        <span className={styles.quotaValue}>
          {formatNumber(remaining)}
          <span className={styles.quotaUnit}>%</span>
        </span>
      </Ring>
      <div className={styles.quotaText}>
        <p className={styles.cardTitle}>{t('activity.usage.remaining')}</p>
        <p className={styles.cardSubtitle}>
          {t('activity.usage.resets', {
            moment: formatResetMoment(data.weekly.resetsAt),
            relative: formatRelativeTime(data.weekly.resetsAt),
          })}
        </p>
        {data.plan && (
          <p className={styles.cardSubtitle}>{t('activity.usage.plan', { plan: data.plan })}</p>
        )}
      </div>
    </Card>
  );
}

/** A usage provider that is configured but has produced no data yet: says why, never errors. */
function PendingCard({ hint }: { hint: string | null }) {
  return (
    <Card className={styles.notConfigured}>
      <span className={styles.notConfiguredIcon}>
        <Icon name="clock" size={20} />
      </span>
      <div className={styles.notConfiguredText}>
        <p className={styles.notConfiguredTitle}>{t('activity.usage.pending')}</p>
        <p>{hint ?? t('activity.usage.pendingText')}</p>
      </div>
    </Card>
  );
}

/** One weekly-quota card per configured usage provider, in configuration order. */
export function UsageSection({ usage }: { usage: readonly UsageEntry[] }) {
  return (
    <>
      {usage.map((entry) => {
        const title = t('activity.usage.title', { label: entry.label });
        return usageState(entry) === 'pending' ? (
          <Section key={entry.id} title={title}>
            <PendingCard hint={entry.hint} />
          </Section>
        ) : (
          <SnapshotSection
            key={entry.id}
            title={title}
            label={entry.label}
            snapshot={entry.snapshot}
          >
            {(data) => <QuotaCard label={entry.label} data={data} />}
          </SnapshotSection>
        );
      })}
    </>
  );
}
