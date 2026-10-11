import type { SystemInfo } from '@shared/api';
import { useT, type T } from '@/i18n';
import { formatNumber, formatTemperature } from '@/lib/format';
import type { UiTone } from '@/lib/tone';
import { Badge } from '@/ui/Badge';
import { Card } from '@/ui/Card';
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

/** Bar from 0 to the critical limit (100 °C when unknown) with ticks at the warning/critical marks. */
function SensorRow({ sensor }: { sensor: Sensor }) {
  const tone = temperatureTone(sensor);
  const scale = Math.max(sensor.crit ?? 100, sensor.celsius, 1);
  const at = (value: number) => `${Math.min(100, (value / scale) * 100)}%`;
  return (
    <li className={styles.sensor}>
      <span className={styles.sensorLabel}>{sensor.label}</span>
      <div
        className={styles.thermo}
        role="meter"
        aria-label={sensor.label}
        aria-valuemin={0}
        aria-valuemax={scale}
        aria-valuenow={sensor.celsius}
        aria-valuetext={formatTemperature(sensor.celsius)}
        data-tone={tone}
      >
        <span className={styles.thermoFill} style={{ width: at(sensor.celsius) }} />
        {sensor.warn !== null && (
          <span className={styles.mark} data-tone="warn" style={{ left: at(sensor.warn) }} />
        )}
        {sensor.crit !== null && (
          <span className={styles.mark} data-tone="crit" style={{ left: at(sensor.crit) }} />
        )}
      </div>
      <span className={styles.sensorValue} data-tone={tone}>
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

export function TemperaturePanel({ sensors }: { sensors: SystemInfo['temperatures'] }) {
  const t = useT();
  const groups = groupTemperatures(sensors);
  const { headline } = groups;
  const tone = headline ? temperatureTone(headline) : 'neutral';
  const note = headline ? limitsNote(headline, t) : null;

  return (
    <Section title={t('system.temperature.title')}>
      <Card className={styles.grow}>
        {sensors.length === 0 || !headline ? (
          <p className={styles.muted}>{t('system.temperature.empty')}</p>
        ) : (
          <div className={styles.stack}>
            <div className={styles.headlineSpread}>
              <div className={styles.figure}>
                <span className={styles.bigValue} data-tone={tone}>
                  {formatNumber(headline.celsius)}
                  <span className={styles.bigUnit}>°C</span>
                </span>
                <span className={styles.figureLabel}>{headline.label}</span>
              </div>
              <Badge tone={tone} dot>
                {toneLabel(tone, t)}
              </Badge>
            </div>

            {groups.cores.length > 0 && (
              <div className={styles.block}>
                <h3 className={styles.subhead}>{t('system.temperature.cores')}</h3>
                <ul className={styles.sensors}>
                  {groups.cores.map((sensor) => (
                    <SensorRow key={sensor.label} sensor={sensor} />
                  ))}
                </ul>
              </div>
            )}

            {groups.other.length > 0 && (
              <div className={styles.block}>
                <h3 className={styles.subhead}>{t('system.temperature.others')}</h3>
                <ul className={styles.sensors}>
                  {groups.other.map((sensor) => (
                    <SensorRow key={sensor.label} sensor={sensor} />
                  ))}
                </ul>
              </div>
            )}
            {note && <p className={styles.footnote}>{note}</p>}
          </div>
        )}
      </Card>
    </Section>
  );
}
