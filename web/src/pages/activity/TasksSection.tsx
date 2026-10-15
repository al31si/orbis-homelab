import type { Snapshot, TaskItem, TasksInfo } from '@shared/api';
import { t } from '@/i18n';
import { formatNumber, formatShortDate } from '@/lib/format';
import { useNow } from '@/lib/useNow';
import { AppLink } from '@/ui/AppLink';
import { StatusDot } from '@/ui/Badge';
import { Icon } from '@/ui/icons';
import { ServiceIcon } from '@/ui/ServiceIcon';
import { isOverdue, pickTasks } from './derive';
import { Figure, SourceHead } from './parts';
import { SnapshotSection } from './SnapshotSection';
import styles from './activity.module.css';

const VISIBLE_TASKS = 5;

function TaskRow({ task, now }: { task: TaskItem; now: number }) {
  const overdue = isOverdue(task, now);
  const content = (
    <>
      <span className={styles.taskText}>
        <span className={styles.taskTitle}>{task.title}</span>
        {task.project && <span className={styles.taskProject}>{task.project}</span>}
      </span>
      {task.dueDate && (
        <time
          className={styles.taskDue}
          dateTime={task.dueDate}
          data-tone={overdue ? 'crit' : undefined}
        >
          {overdue && <StatusDot tone="crit" />}
          {overdue
            ? t('activity.tasks.overdueOn', { date: formatShortDate(task.dueDate, now) })
            : formatShortDate(task.dueDate, now)}
        </time>
      )}
    </>
  );
  return (
    <li>
      {task.url ? (
        <AppLink href={task.url} className={styles.taskRow}>
          {content}
        </AppLink>
      ) : (
        <div className={styles.taskRow}>{content}</div>
      )}
    </li>
  );
}

function Tasks({ data }: { data: TasksInfo }) {
  const now = useNow(60_000);
  const items = pickTasks(data.items, now, VISIBLE_TASKS);
  return (
    <div className={styles.source}>
      <SourceHead
        logo={<ServiceIcon name="vikunja" label="Vikunja" integration="vikunja" />}
        name="Vikunja"
        aside={
          <span className={styles.figures}>
            <Figure
              value={formatNumber(data.openCount)}
              caption={t('activity.tasks.open')}
              dim={data.openCount === 0}
            />
            <Figure
              value={formatNumber(data.overdueCount)}
              caption={t('activity.tasks.overdue')}
              tone={data.overdueCount > 0 ? 'crit' : undefined}
              dim={data.overdueCount === 0}
            />
          </span>
        }
      />
      {data.restricted ? (
        <p className={styles.restricted}>
          <Icon name="lock" size={16} />
          {t('activity.tasks.restricted')}
        </p>
      ) : items.length > 0 ? (
        <ul className={styles.rows} aria-label={t('activity.tasks.listLabel')}>
          {items.map((task) => (
            <TaskRow key={task.id} task={task} now={now} />
          ))}
        </ul>
      ) : (
        <p className={styles.restricted}>
          <Icon name="check-circle" size={16} />
          {t('activity.tasks.none')}
        </p>
      )}
    </div>
  );
}

export function TasksSection({ snapshot }: { snapshot: Snapshot<TasksInfo> }) {
  return (
    <SnapshotSection title={t('activity.tasks.title')} label="Vikunja" snapshot={snapshot}>
      {(data) => <Tasks data={data} />}
    </SnapshotSection>
  );
}
