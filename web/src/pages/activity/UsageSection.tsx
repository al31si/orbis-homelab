import type { QuotaInfo, UsageEntry } from '@shared/api';
import { t } from '@/i18n';
import { formatNumber, formatRelativeTime } from '@/lib/format';
import { StatusDot } from '@/ui/Badge';
import { Card } from '@/ui/Card';
import { ProgressBar } from '@/ui/ProgressBar';
import { Section } from '@/ui/Section';
import { formatResetMoment, quotaTone, usageState } from './derive';
import { SnapshotBody, StaleNote, useFreshness } from './SnapshotSection';
import styles from './activity.module.css';

/** What is left of the week, as one big figure on a long LED meter: low remaining turns warm. */
function Quota({ label, data }: { label: string; data: QuotaInfo }) {
  const remaining = Math.round(data.weekly.remainingPercent);
  const tone = quotaTone(remaining);
  return (
    <>
      <p className={styles.quotaFigure} data-tone={tone}>
        <span className={styles.quotaValue}>{formatNumber(remaining)}</span>
        <span className={styles.quotaUnit}>%</span>
        <span className={styles.quotaCaption}>{t('activity.usage.remaining')}</span>
      </p>
      <ProgressBar
        value={remaining}
        tone={tone}
        cells={30}
        label={t('activity.usage.meterLabel', { label, percent: remaining })}
      />
      <p className={styles.quotaReset}>
        <span>
          {t('activity.usage.resets', { moment: formatResetMoment(data.weekly.resetsAt) })}
        </span>
        <span>{formatRelativeTime(data.weekly.resetsAt)}</span>
      </p>
    </>
  );
}

/** A provider that is configured but has produced no data yet: says why, never errors. */
function Pending({ hint }: { hint: string | null }) {
  return (
    <div className={styles.pending}>
      <p className={styles.lampText}>
        <StatusDot tone="neutral" />
        {t('activity.usage.pending')}
      </p>
      <p className={styles.muted}>{hint ?? t('activity.usage.pendingText')}</p>
    </div>
  );
}

function Provider({ entry }: { entry: UsageEntry }) {
  const { stale, fetchedAt } = useFreshness(entry.snapshot);
  const pending = usageState(entry) === 'pending';
  const plan = entry.snapshot.data?.plan;
  return (
    <li className={styles.provider}>
      <div className={styles.providerHead}>
        <h3 className={styles.providerName}>{entry.label}</h3>
        {plan && <span className={styles.providerPlan}>{t('activity.usage.plan', { plan })}</span>}
      </div>
      {stale && <StaleNote fetchedAt={fetchedAt} />}
      {pending ? (
        <Pending hint={entry.hint} />
      ) : (
        <SnapshotBody label={entry.label} snapshot={entry.snapshot}>
          {(data) => <Quota label={entry.label} data={data} />}
        </SnapshotBody>
      )}
    </li>
  );
}

/** Weekly quota of every configured usage provider, in configuration order, on one plate. */
export function UsageSection({ usage }: { usage: readonly UsageEntry[] }) {
  return (
    <Section title={t('activity.usage.title')}>
      <Card padding="none">
        <ul className={styles.providers}>
          {usage.map((entry) => (
            <Provider key={entry.id} entry={entry} />
          ))}
        </ul>
      </Card>
    </Section>
  );
}
