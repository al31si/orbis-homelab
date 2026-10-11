import { useCallback } from 'react';
import type { ServiceView } from '@shared/api';
import { resolveServiceUrl } from '@/lib/links';
import { t } from '@/i18n';
import { useToast } from '@/ui/Toast';

/** `navigator.clipboard` only exists in secure contexts; the LAN listener is plain http. */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* permission denied: fall through to the legacy path */
  }
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
  document.body.append(field);
  field.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    field.remove();
  }
}

/** Copies a service's resolved address and confirms with a toast. */
export function useCopyAddress(): (service: Pick<ServiceView, 'name' | 'url'>) => Promise<void> {
  const toast = useToast();
  return useCallback(
    async (service) => {
      const address = resolveServiceUrl(service.url);
      if (address === null) return;
      const copied = await writeClipboard(address);
      toast.show(
        copied
          ? {
              id: 'copy-address',
              message: t('services.copied', { name: service.name }),
              tone: 'ok',
            }
          : { id: 'copy-address', message: t('services.copyFailed', { address }), tone: 'crit' },
      );
    },
    [toast],
  );
}
