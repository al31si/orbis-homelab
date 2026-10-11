import type { ReactNode, SVGProps } from 'react';

/**
 * Built-in icon set: 24px grid, 1.75 stroke, round caps and joins.
 * `filled` renders the duotone "selected" state used by navigation.
 */
const ICONS = {
  /* navigation */
  home: <path d="M4 10.6 12 4l8 6.6V19a1 1 0 0 1-1 1h-4.25v-5.25h-5.5V20H5a1 1 0 0 1-1-1z" />,
  services: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.9" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.9" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.9" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.9" />
    </>
  ),
  system: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2.6" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
      <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" fill="none" />
    </>
  ),
  storage: (
    <>
      <ellipse cx="12" cy="6" rx="7.5" ry="3" />
      <path d="M4.5 6v6c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3V6" />
      <path d="M4.5 12v6c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-6" />
    </>
  ),
  activity: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M6.75 12.25h2.1l1.65-3.75 3 7 1.65-3.25h2.1" fill="none" />
    </>
  ),
  settings: (
    <>
      <path d="M4 8h9M17 8h3M4 16h3M11 16h9" fill="none" />
      <circle cx="15" cy="8" r="2.25" />
      <circle cx="9" cy="16" r="2.25" />
    </>
  ),

  /* interface */
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" fill="none" />
    </>
  ),
  'chevron-right': <path d="m9.5 6 6 6-6 6" fill="none" />,
  'chevron-left': <path d="m14.5 6-6 6 6 6" fill="none" />,
  'chevron-down': <path d="m6 9.5 6 6 6-6" fill="none" />,
  'chevron-up': <path d="m6 14.5 6-6 6 6" fill="none" />,
  close: <path d="M6 6l12 12M18 6 6 18" fill="none" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" />,
  plus: <path d="M12 5v14M5 12h14" fill="none" />,
  minus: <path d="M5 12h14" fill="none" />,
  more: (
    <>
      <circle cx="6" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="18" cy="12" r="1" />
    </>
  ),
  refresh: <path d="M20 12a8 8 0 1 1-2.5-5.8M20 4v4.5h-4.5" fill="none" />,
  'arrow-up': <path d="M12 19V5M6 11l6-6 6 6" fill="none" />,
  'arrow-down': <path d="M12 5v14M6 13l6 6 6-6" fill="none" />,
  'arrow-up-right': <path d="M7 17 17 7M8.5 7H17v8.5" fill="none" />,
  'external-link': (
    <path
      d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"
      fill="none"
    />
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path
        d="M15 9V6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15H9"
        fill="none"
      />
    </>
  ),
  star: (
    <path d="m12 3.6 2.55 5.3 5.85.8-4.25 4.05 1.05 5.8L12 16.8l-5.2 2.75 1.05-5.8L3.6 9.7l5.85-.8z" />
  ),
  bell: (
    <>
      <path d="M6 16.5v-5a6 6 0 1 1 12 0v5l1.5 1.75h-15z" />
      <path d="M10 20.5a2.2 2.2 0 0 0 4 0" fill="none" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.25l3.25 1.75" fill="none" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" />
    </>
  ),
  shield: <path d="M12 3.5 5 6.25v5.5c0 4.1 2.9 7.3 7 8.75 4.1-1.45 7-4.65 7-8.75v-5.5z" />,
  download: <path d="M12 4v11M7.5 11 12 15.5l4.5-4.5M5 19.5h14" fill="none" />,
  upload: <path d="M12 15.5v-11M7.5 9 12 4.5 16.5 9M5 19.5h14" fill="none" />,
  share: (
    <path
      d="M12 15V4M8 8l4-4 4 4M8.5 11H7a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 7 20h10a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 17 11h-1.5"
      fill="none"
    />
  ),
  'add-square': (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M12 8.5v7M8.5 12h7" fill="none" />
    </>
  ),
  trash: (
    <path
      d="M4.5 7h15M9.5 7V4.75h5V7M6.5 7l.75 12a1 1 0 0 0 1 .95h7.5a1 1 0 0 0 1-.95L17.5 7M10 11v5M14 11v5"
      fill="none"
    />
  ),
  play: <path d="M8 5.5v13l10.5-6.5z" />,

  /* appearance */
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"
        fill="none"
      />
    </>
  ),
  moon: <path d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1z" />,
  monitor: (
    <>
      <rect x="3.5" y="4.5" width="17" height="11.5" rx="2.5" />
      <path d="M9 20h6M12 16v4" fill="none" />
    </>
  ),

  /* status */
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.25 12.4 2.6 2.6 4.9-5.4" fill="none" />
    </>
  ),
  'alert-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.25M12 16.2v.05" fill="none" />
    </>
  ),
  'x-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" fill="none" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4.2 2.9 19.6a.9.9 0 0 0 .8 1.4h16.6a.9.9 0 0 0 .8-1.4z" />
      <path d="M12 10v4.5M12 17.6v.05" fill="none" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.25M12 7.8v.05" fill="none" />
    </>
  ),
  'wifi-off': (
    <>
      <path d="M3.5 3.5 20.5 20.5" fill="none" />
      <path
        d="M8.5 8.9A11 11 0 0 0 2.5 12.4M21.5 12.4a11 11 0 0 0-8-3.4M6.5 15.4a7 7 0 0 1 4-1.9M17.5 15.4a7 7 0 0 0-1.7-1.3"
        fill="none"
      />
      <path d="M12 19.2v.05" fill="none" />
    </>
  ),

  /* hardware */
  cpu: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2.6" />
      <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" fill="none" />
    </>
  ),
  memory: (
    <>
      <rect x="3" y="7" width="18" height="10" rx="2.2" />
      <path d="M7 11v2M11 11v2M15 11v2M6.5 17v2M10 17v2M14 17v2M17.5 17v2" fill="none" />
    </>
  ),
  thermometer: <path d="M14 14.4V5a2 2 0 0 0-4 0v9.4a4 4 0 1 0 4 0z" />,
  disk: (
    <>
      <rect x="3.5" y="7" width="17" height="10" rx="3" />
      <path d="M7.5 12h5M17 12v.05" fill="none" />
    </>
  ),
  network: (
    <>
      <path d="M8 19V6M4.5 9.5 8 6l3.5 3.5M16 5v13M12.5 14.5 16 18l3.5-3.5" fill="none" />
    </>
  ),
  box: (
    <>
      <path d="M12 3.5 20 8v8l-8 4.5L4 16V8z" />
      <path d="M4 8l8 4.5L20 8M12 12.5v8" fill="none" />
    </>
  ),
  server: (
    <>
      <rect x="3.5" y="4" width="17" height="6.5" rx="2.2" />
      <rect x="3.5" y="13.5" width="17" height="6.5" rx="2.2" />
      <path d="M7.5 7.25v.05M7.5 16.75v.05" fill="none" />
    </>
  ),
  cloud: (
    <path d="M7 18.5a4.25 4.25 0 0 1-.6-8.46A5.75 5.75 0 0 1 17.5 9.4 4.55 4.55 0 0 1 17 18.5z" />
  ),
  list: <path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5v.05M4.5 12v.05M4.5 17.5v.05" fill="none" />,
  wrench: (
    <path d="M14.5 6.5a4 4 0 0 0 4.9 4.9L20.5 12.5 12.5 20.5a2.1 2.1 0 0 1-3-3l8-8" fill="none" />
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

/** Maps the free-form icon name of an extension page to a built-in icon (`box` when unknown). */
export function resolveIconName(name: string): IconName {
  return Object.hasOwn(ICONS, name) ? (name as IconName) : 'box';
}

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name' | 'children'> {
  name: IconName;
  /** Pixel size (default 20). */
  size?: number;
  /** Duotone fill for selected/active states. */
  filled?: boolean;
  /** Accessible name; omit for decorative icons (hidden from assistive tech). */
  title?: string;
}

export function Icon({ name, size = 20, filled = false, title, ...rest }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? 'currentColor' : 'none'}
      fillOpacity={filled ? 0.22 : undefined}
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...rest}
    >
      {ICONS[name]}
    </svg>
  );
}
