/**
 * What client (PWA) extensions may import: `import { Page, useSnapshot } from '@orbis-homelab/sdk/client'`.
 * Extension bundles alias this specifier to a shim (`scripts/make-shims.mjs`) that reads
 * `window.__ORBIS__.sdk`, so nothing here is bundled twice.
 *
 * One explicit line per symbol, no `export *`: whatever is not listed is not part of the
 * contract. The shim generator reads the value exports of this file; type exports are erased.
 */

/* UI primitives */
export { Page } from '../web/src/ui/Page';
export { PageHeader } from '../web/src/ui/Page';
export { Section } from '../web/src/ui/Section';
export { Card } from '../web/src/ui/Card';
export { Button } from '../web/src/ui/Button';
export { Badge } from '../web/src/ui/Badge';
export { StatusDot } from '../web/src/ui/Badge';
export { Chip } from '../web/src/ui/Chip';
export { Notice } from '../web/src/ui/Notice';
export { Sheet } from '../web/src/ui/Sheet';
export { List } from '../web/src/ui/List';
export { ListRow } from '../web/src/ui/List';
export { Skeleton } from '../web/src/ui/Skeleton';
export { EmptyState } from '../web/src/ui/EmptyState';
export { ErrorState } from '../web/src/ui/ErrorState';
export { RelativeTime } from '../web/src/ui/RelativeTime';
export { ProgressBar } from '../web/src/ui/ProgressBar';
export { ServiceIcon } from '../web/src/ui/ServiceIcon';
export { Icon } from '../web/src/ui/icons';

export type { PageProps, PageHeaderProps } from '../web/src/ui/Page';
export type { SectionProps } from '../web/src/ui/Section';
export type { CardProps } from '../web/src/ui/Card';
export type { ButtonProps, ButtonLinkProps } from '../web/src/ui/Button';
export type { BadgeProps, StatusDotProps } from '../web/src/ui/Badge';
export type { ChipProps } from '../web/src/ui/Chip';
export type { NoticeProps } from '../web/src/ui/Notice';
export type { SheetProps } from '../web/src/ui/Sheet';
export type { ListProps, ListRowProps } from '../web/src/ui/List';
export type { SkeletonProps } from '../web/src/ui/Skeleton';
export type { EmptyStateProps } from '../web/src/ui/EmptyState';
export type { ErrorStateProps } from '../web/src/ui/ErrorState';
export type { RelativeTimeProps } from '../web/src/ui/RelativeTime';
export type { ProgressBarProps } from '../web/src/ui/ProgressBar';
export type { ServiceIconProps } from '../web/src/ui/ServiceIcon';
export type { IconName, IconProps } from '../web/src/ui/icons';

/* Instance, data and time */
export { useApp } from '../web/src/boot';
export { useFeatures } from '../web/src/boot';
export { apiFetch } from '../web/src/data';
export { ApiError } from '../web/src/data';
export { isUnreachable } from '../web/src/data';
export { useRefreshAll } from '../web/src/data';
export { useRemoteSnapshot } from '../web/src/data';
export { useSession } from '../web/src/data';
export { useSnapshot } from '../web/src/data';
export { useNow } from '../web/src/lib/useNow';

export type { SnapshotResult, SnapshotStatus } from '../web/src/data';

/* Tones and formatters */
export { toneForContainerState } from '../web/src/lib/tone';
export { toneForServiceState } from '../web/src/lib/tone';
export { toneForSeverity } from '../web/src/lib/tone';
export { toneForStatus } from '../web/src/lib/tone';
export { toneForThreshold } from '../web/src/lib/tone';
export { PLACEHOLDER } from '../web/src/lib/format';
export { formatBytes } from '../web/src/lib/format';
export { formatBytesPerSec } from '../web/src/lib/format';
export { formatClock } from '../web/src/lib/format';
export { formatDuration } from '../web/src/lib/format';
export { formatLatency } from '../web/src/lib/format';
export { formatNumber } from '../web/src/lib/format';
export { formatPercent } from '../web/src/lib/format';
export { formatRelativeTime } from '../web/src/lib/format';
export { formatShortDate } from '../web/src/lib/format';
export { formatTemperature } from '../web/src/lib/format';

export type { UiTone } from '../web/src/lib/tone';

/* Extension helpers */
export { extensionTranslator } from '../web/src/extensions/translator';

export type { ExtensionTranslator } from '../web/src/extensions/translator';
