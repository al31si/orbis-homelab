import { useEffect } from 'react';
import { t } from '@/i18n';
import { applyServiceWorkerUpdate, useServiceWorkerUpdate } from '@/pwa/register';
import { useToast } from '@/ui/Toast';

const TOAST_ID = 'sw-update';

/** Shows "Update available" until the user applies the waiting service worker. */
export function UpdatePrompt() {
  const updateReady = useServiceWorkerUpdate();
  const { show, dismiss } = useToast();

  useEffect(() => {
    if (!updateReady) return;
    show({
      id: TOAST_ID,
      message: t('shell.update.available'),
      tone: 'info',
      duration: 0,
      action: { label: t('shell.update.apply'), onClick: applyServiceWorkerUpdate },
    });
    return () => dismiss(TOAST_ID);
  }, [updateReady, show, dismiss]);

  return null;
}
