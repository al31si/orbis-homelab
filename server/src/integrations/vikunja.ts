import type { TaskItem, TasksInfo } from '../../../shared/api.js';
import { Collector } from '../lib/collector.js';
import { getJsonWithHeaders } from '../lib/http.js';
import type { Integration, IntegrationContext } from './types.js';

interface VikunjaTask {
  id: number;
  title: string;
  done: boolean;
  due_date?: string;
  priority?: number;
  updated: string;
  project_id?: number;
}

/** Vikunja encodes "no due date" as year 0001. */
const isRealDate = (iso: string | undefined): iso is string =>
  Boolean(iso) && !iso!.startsWith('0001');

export function toItem(
  t: VikunjaTask,
  serviceUrl: string | null,
  projects: Map<number, string>,
): TaskItem {
  return {
    id: t.id,
    title: t.title,
    project: (t.project_id && projects.get(t.project_id)) || null,
    done: t.done,
    dueDate: isRealDate(t.due_date) ? t.due_date : null,
    priority: t.priority ?? 0,
    updated: t.updated,
    url: serviceUrl ? `${serviceUrl.replace(/\/$/, '')}/tasks/${t.id}` : null,
  };
}

export type VikunjaData = Omit<TasksInfo, 'restricted'>;

async function collect(ctx: IntegrationContext): Promise<VikunjaData> {
  const headers = { Authorization: `Bearer ${ctx.secret ?? ''}` };
  const query = (filter: string, perPage: number, sort = 'updated', order = 'desc') =>
    `${ctx.baseUrl}/api/v1/tasks?${new URLSearchParams({
      filter,
      per_page: String(perPage),
      sort_by: sort,
      order_by: order,
    })}`;
  const open = 'done = false';
  const overdue = `done = false && due_date < now`;

  const [list, openPage, overduePage, projects] = await Promise.all([
    getJsonWithHeaders<VikunjaTask[]>(query(open, 12), { headers }),
    getJsonWithHeaders<VikunjaTask[]>(query(open, 1), { headers }),
    getJsonWithHeaders<VikunjaTask[]>(query(overdue, 1), { headers }),
    getJsonWithHeaders<{ id: number; title: string }[]>(
      `${ctx.baseUrl}/api/v1/projects?per_page=50`,
      {
        headers,
      },
    ).catch(() => null),
  ]);
  const projectNames = new Map((projects?.json ?? []).map((p) => [p.id, p.title]));
  // With per_page=1 the total page count equals the total number of matches.
  const total = (h: Record<string, string | string[] | undefined>, fallback: number) => {
    const v = Number(h['x-pagination-total-pages']);
    return Number.isFinite(v) ? v : fallback;
  };
  return {
    openCount: total(openPage.headers, openPage.json.length),
    overdueCount: total(overduePage.headers, overduePage.json.length),
    items: list.json.map((t) => toItem(t, ctx.serviceUrl, projectNames)),
  };
}

export function createVikunja(ctx: IntegrationContext): Integration<VikunjaData> {
  const { t } = ctx;
  const configured = Boolean(ctx.secret);
  return {
    serviceId: ctx.serviceId,
    type: 'vikunja',
    label: ctx.serviceName,
    configured,
    collector: configured
      ? new Collector<VikunjaData>({
          id: `integration:${ctx.serviceId}`,
          label: ctx.serviceName,
          intervalMs: 60_000,
          run: () => collect(ctx),
        })
      : null,
    describe: (d) => ({
      badges:
        d.overdueCount > 0
          ? [
              {
                tone: 'warn',
                label: t('integrations.vikunjaOverdueBadge', { count: d.overdueCount }),
              },
            ]
          : [],
      metrics: [
        { label: t('integrations.vikunjaOpen'), value: String(d.openCount) },
        {
          label: t('integrations.vikunjaOverdue'),
          value: String(d.overdueCount),
          tone: d.overdueCount > 0 ? 'warn' : 'ok',
        },
      ],
    }),
    alerts: () => [],
  };
}
