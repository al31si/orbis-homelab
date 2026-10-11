import type { ReactNode } from 'react';
import { t } from '@/i18n';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

export interface ErrorStateProps {
  title?: string;
  description?: ReactNode;
  /** Shows a retry button when provided. */
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = t('ui.errorState.title'),
  description = t('ui.errorState.description'),
  onRetry,
  retryLabel = t('common.retry'),
  className,
}: ErrorStateProps) {
  return (
    <div data-tone="crit">
      <EmptyState
        icon="alert-circle"
        title={title}
        description={description}
        className={className}
        action={
          onRetry && (
            <Button icon="refresh" onClick={onRetry}>
              {retryLabel}
            </Button>
          )
        }
      />
    </div>
  );
}
