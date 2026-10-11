import type { Overview } from '@shared/api';
import type { SnapshotStatus } from '@/data';
import { useT } from '@/i18n';
import { toneForStatus } from '@/lib/tone';
import { Card } from '@/ui/Card';
import { Ring } from '@/ui/Ring';
import { UpdatedAt } from '@/ui/UpdatedAt';
import { heroStatus, heroSummary, statusWord } from './summary';
import styles from './home.module.css';

export interface HomeHeroProps {
  overview: Overview;
  status: SnapshotStatus;
  fetchedAt: number | null;
}

/** Overall status: score ring, one status word, one summary line. */
export function HomeHero({ overview, status, fetchedAt }: HomeHeroProps) {
  const t = useT();
  const overall = heroStatus(overview);
  const tone = toneForStatus(overall);
  const score = Math.round(overview.score);
  return (
    <Card padding="lg" tone={overall === 'ok' ? undefined : tone} className={styles.hero}>
      <Ring value={score} tone={tone} size={92} stroke={9} label={t('home.hero.score', { score })}>
        <span className={styles.score} data-long={score >= 100 || undefined}>
          <span className={styles.scoreValue}>{score}</span>
          <span className={styles.scoreLabel}>{t('home.hero.scoreLabel')}</span>
        </span>
      </Ring>
      <div className={styles.heroText}>
        <p className={styles.statusWord} data-tone={tone}>
          {statusWord(overall)}
        </p>
        <p className={styles.summary}>{heroSummary(overview, overall)}</p>
        <UpdatedAt fetchedAt={fetchedAt} status={status} className={styles.updated} />
      </div>
    </Card>
  );
}
