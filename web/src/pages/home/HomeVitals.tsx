import type { CSSProperties } from 'react';
import type { Overview, SystemInfo } from '@shared/api';
import { useFeatures } from '@/boot';
import { useSnapshot } from '@/data';
import { useT } from '@/i18n';
import { PLACEHOLDER, formatBytes, formatNumber } from '@/lib/format';
import { toneForThreshold, type UiTone } from '@/lib/tone';
import { Section } from '@/ui/Section';
import { StatTile } from '@/ui/StatTile';
import { tempLimits, visibleVitals } from './summary';
import styles from './home.module.css';

const TEMPERATURE_KEY = {
  ok: 'home.vitals.temperature.ok',
  warn: 'home.vitals.temperature.warn',
  crit: 'home.vitals.temperature.crit',
  info: 'home.vitals.temperature.ok',
  neutral: 'home.vitals.temperature.none',
} as const satisfies Record<UiTone, string>;

interface VitalsProps {
  overview: Overview;
  /** Detailed system snapshot (history, memory); null when unavailable or not a system instance. */
  system: SystemInfo | null;
}

function Vitals({ overview, system }: VitalsProps) {
  const t = useT();
  const tiles = visibleVitals(useFeatures(), overview.system);
  if (tiles.length === 0) return null;

  const live = overview.system;
  const storage = overview.storage;
  const limits = tempLimits(system?.temperatures);
  const temp = live?.cpuTempC ?? null;
  const tempTone: UiTone =
    temp === null ? 'neutral' : toneForThreshold(temp, limits.warn, limits.crit);

  const tileById = {
    cpu: (
      <StatTile
        key="cpu"
        label={t('home.vitals.cpu')}
        icon="cpu"
        href="/system"
        value={live ? formatNumber(live.cpuPercent) : PLACEHOLDER}
        unit={live ? '%' : undefined}
        detail={
          live
            ? t('home.vitals.cpuDetail', { cores: live.cores, load: formatNumber(live.load1, 1) })
            : undefined
        }
        tone={live ? toneForThreshold(live.cpuPercent, 70, 90) : 'neutral'}
        spark={system?.history.map((point) => point.cpu)}
        sparkMin={0}
        sparkMax={100}
      />
    ),
    memory: (
      <StatTile
        key="memory"
        label={t('home.vitals.memory')}
        icon="memory"
        href="/system"
        value={live ? formatNumber(live.memoryPercent) : PLACEHOLDER}
        unit={live ? '%' : undefined}
        detail={
          system
            ? t('home.vitals.usedOf', {
                used: formatBytes(system.memory.usedBytes),
                total: formatBytes(system.memory.totalBytes),
              })
            : undefined
        }
        tone={live ? toneForThreshold(live.memoryPercent, 80, 92) : 'neutral'}
        spark={system?.history.map((point) => point.mem)}
        sparkMin={0}
        sparkMax={100}
      />
    ),
    storage: (
      <StatTile
        key="storage"
        label={storage?.label || t('home.vitals.storage')}
        icon="storage"
        href="/storage"
        value={storage ? formatNumber(storage.percent) : PLACEHOLDER}
        unit={storage ? '%' : undefined}
        detail={
          storage
            ? t('home.vitals.usedOf', {
                used: formatBytes(storage.usedBytes),
                total: formatBytes(storage.sizeBytes),
              })
            : undefined
        }
        tone={storage ? toneForThreshold(storage.percent, 80, 92) : 'neutral'}
        progress={storage?.percent}
      />
    ),
    temperature: (
      <StatTile
        key="temperature"
        label={t('home.vitals.temperature')}
        icon="thermometer"
        href="/system"
        value={temp === null ? PLACEHOLDER : formatNumber(temp)}
        unit={temp === null ? undefined : '°C'}
        detail={t(TEMPERATURE_KEY[tempTone])}
        tone={tempTone}
        progress={temp === null ? undefined : (temp / limits.crit) * 100}
      />
    ),
  };

  return (
    <Section title={t('home.vitals.title')}>
      <div
        className={styles.vitals}
        style={{ '--tiles': Math.min(tiles.length, 4) } as CSSProperties}
      >
        {tiles.map((id) => tileById[id])}
      </div>
    </Section>
  );
}

/** Subscribes to the system snapshot: only mounted when `features.system` is on. */
function SystemVitals({ overview }: { overview: Overview }) {
  const system = useSnapshot('system').data;
  return <Vitals overview={overview} system={system} />;
}

/**
 * The few numbers worth glancing at: CPU, memory, headline storage, temperature. Each tile
 * exists only when its source does; with none of them the section is left out.
 */
export function HomeVitals({ overview }: { overview: Overview }) {
  const features = useFeatures();
  return features.system ? (
    <SystemVitals overview={overview} />
  ) : (
    <Vitals overview={overview} system={null} />
  );
}
