import type { CSSProperties } from 'react';
import type { SystemInfo } from '@shared/api';
import { useT, type T } from '@/i18n';
import { formatNumber, formatTemperature } from '@/lib/format';
import type { UiTone } from '@/lib/tone';
import { StatusDot } from '@/ui/Badge';
import { Card } from '@/ui/Card';
import { ProgressBar } from '@/ui/ProgressBar';
import { Section } from '@/ui/Section';
import { groupTemperatures, temperatureTone } from './derive';
import styles from './system.module.css';

type Sensor = SystemInfo['temperatures'][number];

function toneLabel(tone: UiTone, t: T): string {
  switch (tone) {
    case 'warn':
      return t('system.temperature.warn');
    case 'crit':
      return t('system.temperature.crit');
    case 'neutral':
      return t('system.temperature.noLimits');
    default:
      return t('system.temperature.ok');
  }
}

/** The meter runs from 0 to the critical limit (100 °C when unknown). */
function scaleOf(sensor: Sensor): number {
  return Math.max(sensor.crit ?? 100, sensor.celsius, 1);
}

function SensorRow({ sensor }: { sensor: Sensor }) {
  const tone = temperatureTone(sensor);
  return (
    <li className={styles.meterRow}>
      <span className={styles.rowLabel} title={sensor.label}>
        {sensor.label}
      </span>
      <ProgressBar
        value={sensor.celsius}
        max={scaleOf(sensor)}
        tone={tone}
        label={sensor.label}
        size="sm"
        cells={24}
      />
      <span className={styles.rowValue} data-tone={tone}>
        {formatTemperature(sensor.celsius)}
      </span>
    </li>
  );
}

function limitsNote(sensor: Sensor, t: T): string | null {
  if (sensor.warn === null && sensor.crit === null) return null;
  const parts = [
    sensor.warn !== null &&
      t('system.temperature.warnAt', { value: formatTemperature(sensor.warn) }),
    sensor.crit !== null &&
      t('system.temperature.critAt', { value: formatTemperature(sensor.crit) }),
  ].filter(Boolean);
  return t('system.temperature.limits', { parts: parts.join(', ') });
}

/** The headline sensor against its limits: the meter with a tick at each threshold. */
function Thermometer({ sensor, note }: { sensor: Sensor; note: string | null }) {
  const tone = temperatureTone(sensor);
  const scale = scaleOf(sensor);
  const marks = [
    { id: 'warn', value: sensor.warn },
    { id: 'crit', value: sensor.crit },
  ].flatMap((mark) => (mark.value === null ? [] : [{ id: mark.id, value: mark.value }]));
  return (
    <div className={styles.thermo}>
      <ProgressBar value={sensor.celsius} max={scale} tone={tone} label={sensor.label} cells={40} />
      {marks.length > 0 && (
        <div className={styles.thermoScale} aria-hidden>
          {marks.map((mark) => {
            const at = Math.min(100, (mark.value / scale) * 100);
            return (
              <span
                key={mark.id}
                className={styles.thermoMark}
                data-tone={mark.id}
                data-end={at > 88 || undefined}
                style={{ '--at': `${at}%` } as CSSProperties}
              >
                {formatNumber(mark.value)}
              </span>
            );
          })}
        </div>
      )}
      {note && <p className="sr-only">{note}</p>}
    </div>
  );
}

export function TemperaturePanel({ sensors }: { sensors: SystemInfo['temperatures'] }) {
  const t = useT();
  const groups = groupTemperatures(sensors);
  const { headline } = groups;
  const tone = headline ? temperatureTone(headline) : 'neutral';

  return (
    <Section title={t('system.temperature.title')}>
      <Card padding="none" className={styles.plate}>
        {sensors.length === 0 || !headline ? (
          <p className={styles.muted}>{t('system.temperature.empty')}</p>
        ) : (
          <>
            <div className={styles.block} data-tone={tone}>
              <div className={styles.headline}>
                <div className={styles.figure}>
                  <span className={styles.value} data-tone={tone}>
                    {formatNumber(headline.celsius)}
                    <span className={styles.unit}>°C</span>
                  </span>
                  <span className={styles.figureLabel}>{headline.label}</span>
                </div>
                <p className={styles.lamp}>
                  <StatusDot tone={tone} />
                  {toneLabel(tone, t)}
                </p>
              </div>
              <Thermometer sensor={headline} note={limitsNote(headline, t)} />
            </div>

            {groups.cores.length > 0 && (
              <div className={styles.block}>
                <h3 className={styles.subhead}>{t('system.temperature.cores')}</h3>
                <ul className={styles.meterRows}>
                  {groups.cores.map((sensor) => (
                    <SensorRow key={sensor.label} sensor={sensor} />
                  ))}
                </ul>
              </div>
            )}

            {groups.other.length > 0 && (
              <div className={styles.block}>
                <h3 className={styles.subhead}>{t('system.temperature.others')}</h3>
                <ul className={styles.meterRows}>
                  {groups.other.map((sensor) => (
                    <SensorRow key={sensor.label} sensor={sensor} />
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </Card>
    </Section>
  );
}
