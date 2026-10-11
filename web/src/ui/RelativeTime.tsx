import { useEffect, useState } from 'react';
import { getLocale } from '@/i18n';
import { formatClock, formatRelativeTime } from '@/lib/format';

export interface RelativeTimeProps {
  /** ISO string, epoch ms or Date. */
  value: string | number | Date | null | undefined;
  className?: string;
}

/** Ticking relative time ("2 min ago"); the tooltip has the exact date and clock time. */
export function RelativeTime({ value, className }: RelativeTimeProps) {
  const time = value == null ? Number.NaN : new Date(value).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (Number.isNaN(time)) return;
    // Tick every second while the text changes every second, slower as it ages.
    const age = Date.now() - time;
    const delay = age < 60_000 ? 1_000 : age < 3_600_000 ? 15_000 : 60_000;
    const id = window.setTimeout(() => setNow(Date.now()), delay);
    return () => window.clearTimeout(id);
  }, [now, time]);

  if (Number.isNaN(time)) return <span className={className}>{formatRelativeTime(null)}</span>;
  return (
    <time
      className={className}
      dateTime={new Date(time).toISOString()}
      title={`${new Date(time).toLocaleDateString(getLocale())} ${formatClock(time)}`}
    >
      {formatRelativeTime(time, now)}
    </time>
  );
}
