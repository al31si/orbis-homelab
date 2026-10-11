import type { Snapshot, TaskItem, TasksInfo } from '@shared/api';
import { t } from '@/i18n';
import { formatNumber, formatShortDate } from '@/lib/format';
import { useNow } from '@/lib/useNow';
import { Badge } from '@/ui/Badge';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/icons';
import { List, ListRow } from '@/ui/List';
import { isOverdue, pickTasks } from './derive';
import { SnapshotSection } from './SnapshotSection';
import styles from './activity.module.css';

const VISIBLE_TASKS = 5;

function TaskRow({ task, now }: { task: TaskItem; now: number }) {
  const overdue = isOverdue(task, now);
  return (
    <ListRow
      href={task.url ?? undefined}
      multiline
      title={task.title}
      subtitle={task.project ?? undefined}
      trailing={
        task.dueDate ? (
          <Badge tone={overdue ? 'crit' : 'neutral'}>
            {overdue
              ? t('activity.tasks.overdueOn', { date: formatShortDate(task.dueDate, now) })
              : formatShortDate(task.dueDate, now)}
          </Badge>
        ) : undefined
      }
    />
  );
}

function Tasks({ data }: { data: TasksInfo }) {
  const now = useNow(60_000);
  const items = pickTasks(data.items, now, VISIBLE_TASKS);
  return (
    <Card padding="none">
      <dl className={styles.taskCounts}>
        <div className={styles.taskCount}>
          <dd className={styles.taskValue}>{formatNumber(data.openCount)}</dd>
          <dt className={styles.taskLabel}>{t('activity.tasks.open')}</dt>
        </div>
        <div className={styles.taskCount} data-tone={data.overdueCount > 0 ? 'crit' : undefined}>
          <dd className={styles.taskValue}>{formatNumber(data.overdueCount)}</dd>
          <dt className={styles.taskLabel}>{t('activity.tasks.overdue')}</dt>
        </div>
      </dl>
      {data.restricted ? (
        <p className={styles.restricted}>
          <Icon name="lock" size={16} />
          {t('activity.tasks.restricted')}
        </p>
      ) : items.length > 0 ? (
        <div className={styles.divided}>
          <List variant="plain" aria-label={t('activity.tasks.listLabel')}>
            {items.map((task) => (
              <TaskRow key={task.id} task={task} now={now} />
            ))}
          </List>
        </div>
      ) : (
        <p className={styles.restricted}>
          <Icon name="check-circle" size={16} />
          {t('activity.tasks.none')}
        </p>
      )}
    </Card>
  );
}

export function TasksSection({ snapshot }: { snapshot: Snapshot<TasksInfo> }) {
  return (
    <SnapshotSection title={t('activity.tasks.title')} label="Vikunja" snapshot={snapshot}>
      {(data) => <Tasks data={data} />}
    </SnapshotSection>
  );
}
