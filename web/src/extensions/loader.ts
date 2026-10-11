import type { ExtensionRef } from '@shared/api';
import { isInternalHref } from '@/lib/links';

/** The slice of `Document` the loader uses. */
export type LoaderDocument = Pick<Document, 'head' | 'createElement'>;

/**
 * Injects the client bundle of every extension the server reported: an ES module script plus an
 * optional stylesheet. Call after first render and after `exposeHostGlobals()`. A bundle that fails
 * to load is a console warning, never an error for the app.
 */
export function loadExtensions(
  refs: readonly ExtensionRef[],
  doc: LoaderDocument = document,
): void {
  for (const ref of refs) {
    if (!isInternalHref(ref.script) || (ref.style !== null && !isInternalHref(ref.style))) {
      console.warn(`Extension "${ref.id}" skipped: bundle URLs must be same-origin paths`);
      continue;
    }
    if (ref.style !== null) {
      const link = doc.createElement('link');
      link.rel = 'stylesheet';
      link.href = ref.style;
      link.onerror = () => console.warn(`Extension "${ref.id}": stylesheet failed to load`);
      doc.head.append(link);
    }
    const script = doc.createElement('script');
    script.type = 'module';
    script.src = ref.script;
    script.onerror = () => console.warn(`Extension "${ref.id}": bundle failed to load`);
    doc.head.append(script);
  }
}
