import type { ServiceView } from '@shared/api';
import { useSnapshot } from '@/data';
import { useT } from '@/i18n';
import { formatBytes, formatPercent } from '@/lib/format';
import { toneForContainerState } from '@/lib/tone';
import { localizeUptime } from '@/pages/system/derive';
import { StatusDot } from '@/ui/Badge';
import { ProgressBar } from '@/ui/ProgressBar';
import { Section } from '@/ui/Section';
import { containerRows, containerStateLabel, shortContainerNames } from './catalog';
import styles from './detail.module.css';

/** "812 MB" -> figure and unit, so the unit can sit beside the numerals in a smaller size. */
function splitUnit(text: string): { figure: string; unit: string } {
  const match = /^([\d.,\s-]*\d)\s*(\D*)$/.exec(text);
  return match ? { figure: match[1] ?? text, unit: match[2] ?? '' } : { figure: text, unit: '' };
}

function Readout({ label, value }: { label: string; value: string }) {
  const { figure, unit } = splitUnit(value);
  return (
    <div className={styles.usageItem}>
      <dt>{label}</dt>
      <dd>
        <span className={styles.figure}>{figure}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </dd>
    </div>
  );
}

/**
 * The service's resource use, then each container, anomalies first, with state, CPU, memory and
 * uptime. Mount it only when `features.containers` is on: it subscribes to the containers snapshot
 * for uptimes.
 */
export function ServiceContainers({ service }: { service: ServiceView }) {
  const t = useT();
  const docker = useSnapshot('containers').data;
  const totalMemory = useSnapshot('system').data?.memory.totalBytes ?? 0;
  const rows = containerRows(service, docker);
  const names = shortContainerNames(rows.map((row) => row.name));
  const memoryPercent = totalMemory > 0 ? (service.memoryBytes / totalMemory) * 100 : null;
  const many = rows.length > 1;

  return (
    <Section
      title={t('services.containers.title')}
      action={rows.length > 0 && <span className={styles.count}>{rows.length}</span>}
    >
      {rows.length === 0 ? (
        <p className={styles.empty}>{t('services.containers.none')}</p>
      ) : (
        <>
          <div className={styles.usage}>
            <dl className={styles.usageRow}>
              <Readout
                label={t('services.containers.cpu')}
                value={formatPercent(service.cpuPercent, 1)}
              />
              <Readout
                label={t('services.containers.memory')}
                value={formatBytes(service.memoryBytes)}
              />
            </dl>
            {memoryPercent !== null && (
              <div className={styles.meter}>
                <ProgressBar
                  value={memoryPercent}
                  label={t('services.containers.memoryMeter')}
                  size="sm"
                  cells={30}
                />
                <p className={styles.meterCaption}>
                  {t('services.containers.memoryShare', {
                    percent: formatPercent(memoryPercent, memoryPercent < 10 ? 1 : 0),
                  })}
                </p>
              </div>
            )}
          </div>
          <ul className={styles.rows} aria-label={t('services.containers.list')}>
            {rows.map((row, index) => {
              const tone = toneForContainerState(row.state);
              return (
                <li key={row.name} className={styles.row} data-tone={tone}>
                  <StatusDot tone={tone} className={styles.rowLamp} />
                  <span className={styles.rowMain}>
                    <span className={styles.rowTitle} title={row.name}>
                      {names[index]}
                    </span>
                    <span className={styles.rowSub}>
                      <span className={styles.cState} data-tone={tone}>
                        {containerStateLabel(row.state)}
                      </span>
                      {row.uptime && <span>{localizeUptime(row.uptime)}</span>}
                    </span>
                  </span>
                  {many && (
                    <span className={styles.numbers}>
                      <span>
                        <span className="sr-only">{t('services.containers.cpu')} </span>
                        {formatPercent(row.cpuPercent, 1)}
                      </span>
                      <span>
                        <span className="sr-only">{t('services.containers.memory')} </span>
                        {formatBytes(row.memoryBytes)}
                      </span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Section>
  );
}
