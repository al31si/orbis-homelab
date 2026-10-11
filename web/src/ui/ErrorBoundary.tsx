import { Component, type ErrorInfo, type ReactNode } from 'react';
import { t } from '@/i18n';
import { applyServiceWorkerUpdate } from '@/pwa/register';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
}

/**
 * Last-resort recovery screen: something threw while rendering. If a newer app version is
 * waiting, installing it is the likelier fix than reloading the same cached bundle.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('UI error', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <main className={styles.screen} data-tone="crit">
        <EmptyState
          icon="alert-circle"
          title={t('ui.errorBoundary.title')}
          description={t('ui.errorBoundary.description')}
          action={
            <Button
              variant="primary"
              icon="refresh"
              onClick={() => {
                if (!applyServiceWorkerUpdate()) window.location.reload();
              }}
            >
              {t('ui.errorBoundary.reload')}
            </Button>
          }
        />
      </main>
    );
  }
}
