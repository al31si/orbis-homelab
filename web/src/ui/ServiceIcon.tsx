import { useState, type CSSProperties, type ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { monogram, monogramColor } from './ServiceIconMonogram';
import styles from './ServiceIcon.module.css';

interface ServiceMark {
  /** Brand colour of the tile. */
  bg: string;
  /** Glyph colour (dark on light brand colours). */
  fg: string;
  glyph: ReactNode;
}

const WHITE = '#ffffff';

/** Neutral backdrop of a custom image, so transparent logos read in light and dark themes. */
const IMAGE_TILE_BG = '#f4f6fa';

/** Simple glyphs on the 24px grid, drawn as strokes so they share the icon set's language. */
const MARKS = {
  jellyfin: {
    bg: '#a35bd0',
    fg: WHITE,
    glyph: (
      <>
        <path d="M12 4.75 19.25 18H4.75z" />
        <path d="M12 10.5 14.75 15.5H9.25z" />
      </>
    ),
  },
  navidrome: {
    bg: '#1f8fd0',
    fg: WHITE,
    glyph: (
      <>
        <circle cx="12" cy="12" r="7.75" />
        <circle cx="12" cy="12" r="2.25" />
      </>
    ),
  },
  seerr: {
    bg: '#6366f1',
    fg: WHITE,
    glyph: (
      <>
        <circle cx="10.5" cy="10.5" r="5.75" />
        <path d="m15 15 4.75 4.75" />
      </>
    ),
  },
  radarr: {
    bg: '#f5b92e',
    fg: '#3a2a00',
    glyph: (
      <>
        <circle cx="12" cy="12" r="7.75" />
        <circle cx="12" cy="12" r="3.5" />
        <path d="m12 12 5.5-5.5" />
      </>
    ),
  },
  sonarr: {
    bg: '#35b8e8',
    fg: '#04324a',
    glyph: (
      <>
        <path d="M4.5 9.5a11 11 0 0 1 15 0M7.5 12.75a6.6 6.6 0 0 1 9 0M10.6 16a2.2 2.2 0 0 1 2.8 0" />
        <path d="M12 19.25v.05" />
      </>
    ),
  },
  lidarr: {
    bg: '#12a05c',
    fg: WHITE,
    glyph: (
      <>
        <path d="M9 17.5V6.25l9-2V16" />
        <circle cx="6.75" cy="17.5" r="2.25" />
        <circle cx="15.75" cy="16" r="2.25" />
      </>
    ),
  },
  prowlarr: {
    bg: '#e5691a',
    fg: WHITE,
    glyph: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="m15 9-1.5 4.5L9 15l1.5-4.5z" />
      </>
    ),
  },
  qbittorrent: {
    bg: '#2c6ec2',
    fg: WHITE,
    glyph: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 7.5v8.25M8.75 12.5l3.25 3.25 3.25-3.25" />
      </>
    ),
  },
  lidseeker: {
    bg: '#c0316f',
    fg: WHITE,
    glyph: (
      <>
        <circle cx="10.5" cy="10.5" r="5.75" />
        <path d="m15 15 4.75 4.75M8.5 12v-2M10.5 13.25v-5M12.5 12v-2" />
      </>
    ),
  },
  seafile: {
    bg: '#f28a1b',
    fg: '#3b2000',
    glyph: <path d="M7 18a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17 9.5 4.25 4.25 0 0 1 16.5 18z" />,
  },
  n8n: {
    bg: '#ea4b71',
    fg: WHITE,
    glyph: (
      <>
        <circle cx="6" cy="12" r="2.1" />
        <circle cx="18" cy="6.25" r="2.1" />
        <circle cx="18" cy="17.75" r="2.1" />
        <path d="m8 11 8-3.75M8 13l8 3.75" />
      </>
    ),
  },
  olivetin: {
    bg: '#7a9a2a',
    fg: '#1c2a00',
    glyph: <path d="M13 3.75 5.75 13.5H12l-1 6.75 7.25-9.75H12z" />,
  },
  mealie: {
    bg: '#d9771c',
    fg: WHITE,
    glyph: (
      <>
        <path d="M6.5 4v6a2 2 0 0 0 4 0V4M8.5 12v8" />
        <path d="M17.5 20V4c-2.25 1.4-3.5 4-3.5 7.25H17.5" />
      </>
    ),
  },
  portainer: {
    bg: '#0e9ed0',
    fg: WHITE,
    glyph: (
      <>
        <path d="M12 3.75 19.75 8v8L12 20.25 4.25 16V8z" />
        <path d="M4.25 8 12 12.25 19.75 8M12 12.25v8" />
      </>
    ),
  },
  vikunja: {
    bg: '#1973ff',
    fg: WHITE,
    glyph: <path d="m6 12.75 4 4L18.25 7.5" />,
  },
  generic: {
    bg: '#56657f',
    fg: WHITE,
    glyph: (
      <>
        <rect x="5" y="5" width="6" height="6" rx="1.5" />
        <rect x="13" y="5" width="6" height="6" rx="1.5" />
        <rect x="5" y="13" width="6" height="6" rx="1.5" />
        <rect x="13" y="13" width="6" height="6" rx="1.5" />
      </>
    ),
  },
} satisfies Record<string, ServiceMark>;

export type ServiceIconName = keyof typeof MARKS;

function markFor(name: string): ServiceMark | null {
  return name in MARKS && name !== 'generic' ? MARKS[name as ServiceIconName] : null;
}

export interface ServiceIconProps {
  /** Icon key from the service catalog (`ServiceView.icon`); unknown keys render the fallback. */
  name: string;
  /** Custom icon served by the BFF (`ServiceView.iconUrl`); takes precedence over `name`. */
  iconUrl?: string | null;
  /**
   * Display name of the service. Without a built-in mark, the tile shows its monogram on a
   * colour derived from the name instead of the generic glyph.
   */
  label?: string;
  /** Tile edge in px (default 40). */
  size?: number;
  className?: string;
}

/**
 * Rounded-square service tile: the custom image when there is one (and it loads), else the
 * built-in brand glyph, else a monogram of the service name, else the generic glyph.
 */
export function ServiceIcon({
  name,
  iconUrl = null,
  label,
  size = 40,
  className,
}: ServiceIconProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const imageUrl = iconUrl !== null && iconUrl !== failedUrl ? iconUrl : null;
  const mark = markFor(name);
  const initials = mark === null && label ? monogram(label) : '';

  let fallback: ServiceMark = MARKS.generic;
  if (mark) fallback = mark;
  else if (initials) fallback = { bg: monogramColor(label ?? ''), fg: WHITE, glyph: null };

  const style = {
    '--tile-bg': imageUrl ? IMAGE_TILE_BG : fallback.bg,
    '--tile-fg': fallback.fg,
    '--tile-size': `${size}px`,
  } as CSSProperties;

  let content: ReactNode;
  if (imageUrl) {
    content = (
      <img
        className={styles.image}
        src={imageUrl}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailedUrl(imageUrl)}
      />
    );
  } else if (initials) {
    content = <span className={styles.monogram}>{initials}</span>;
  } else {
    content = (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {fallback.glyph}
      </svg>
    );
  }

  return (
    <span className={cx(styles.tile, className)} style={style} aria-hidden>
      {content}
    </span>
  );
}
