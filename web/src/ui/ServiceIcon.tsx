import { useState, type CSSProperties } from 'react';
import { cx } from '@/lib/cx';
import { brandLogoUrl } from './brand/logos';
import { resolveBrand } from './brand/registry';
import { monogram } from './ServiceIconMonogram';
import styles from './ServiceIcon.module.css';

export interface ServiceIconProps {
  /** Icon key from the service catalog (`ServiceView.icon`). */
  name: string;
  /** Custom icon served by the BFF (`ServiceView.iconUrl`); takes precedence over everything. */
  iconUrl?: string | null;
  /** Display name of the service: used to recognise it and for the monogram fallback. */
  label?: string;
  /** Service id from `services.yaml`, used to recognise the product. */
  serviceId?: string;
  /** Integration type of the service (`radarr`...), used to recognise the product. */
  integration?: string;
  /** Tile edge in px (default 40). */
  size?: number;
  className?: string;
}

/**
 * Rounded-square service tile, in order of preference: the owner's own image, the logo of the
 * product when it is recognised with certainty (see `brand/registry`), the monogram of the name,
 * a neutral glyph. The tile behind a logo is the same light plate in both themes, so dark logos
 * stay readable and every logo gets the same margin.
 */
export function ServiceIcon({
  name,
  iconUrl = null,
  label,
  serviceId,
  integration,
  size = 40,
  className,
}: ServiceIconProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const custom = iconUrl !== null && iconUrl !== failedUrl ? iconUrl : null;
  const brand = custom
    ? null
    : resolveBrand({ icon: name, id: serviceId, name: label, integration });
  const logo = brand ? brandLogoUrl(brand.id) : null;
  const initials = !custom && !logo && label ? monogram(label) : '';

  const style = { '--tile-size': `${size}px` } as CSSProperties;
  const src = custom ?? logo;

  return (
    <span
      className={cx(styles.tile, src ? styles.plate : styles.neutral, className)}
      style={style}
      aria-hidden
    >
      {src ? (
        <img
          className={cx(styles.image, custom && styles.custom)}
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={custom ? () => setFailedUrl(custom) : undefined}
        />
      ) : initials ? (
        <span className={styles.monogram}>{initials}</span>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="5" y="5" width="6" height="6" rx="1" />
          <rect x="13" y="5" width="6" height="6" rx="1" />
          <rect x="5" y="13" width="6" height="6" rx="1" />
          <rect x="13" y="13" width="6" height="6" rx="1" />
        </svg>
      )}
    </span>
  );
}
