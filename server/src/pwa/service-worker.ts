/** The line of `sw.js` the frontend writes and this module replaces (see the interface summary). */
const MARKER = /^(const INSTANCE = \/\*__SW_INSTANCE__\*\/ ).*;[ \t]*$/m;

export interface ServiceWorkerInstance {
  cachePrefix: string;
  offlineText: string;
  notificationTitle: string;
}

/** Fails fast (at startup) when the bundled service worker has no instance marker. */
export function checkServiceWorkerTemplate(template: string): void {
  if (!MARKER.test(template)) throw new Error('sw.js template: missing INSTANCE marker line');
}

/** Replaces the whole `INSTANCE` object literal with JSON; the rest of the file is untouched. */
export function renderServiceWorker(template: string, instance: ServiceWorkerInstance): string {
  return template.replace(MARKER, (_line, head: string) => `${head}${JSON.stringify(instance)};`);
}
