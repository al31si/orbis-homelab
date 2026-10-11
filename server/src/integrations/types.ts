import type { Severity } from '../../../shared/api.js';
import type { ExtensionIntegration } from '../../../sdk/server.js';
import type { T as Translator } from '../i18n/index.js';
import type { Collector } from '../lib/collector.js';

export interface IntegrationAlert {
  severity: Severity;
  title: string;
  detail: string;
  /**
   * Language-independent identity of the condition, used in the alert id
   * (`integration:<serviceId>:<key>`). Without it the id is derived from the title.
   */
  key?: string;
}

/**
 * An adapter attached to a catalog service. Structurally a superset of `ExtensionIntegration`
 * (sdk/server.ts): built-in adapters and extension ones are handled by the same code.
 */
export interface Integration<T = unknown> extends Omit<
  ExtensionIntegration<T>,
  'collector' | 'alerts'
> {
  /** Null when the credential is missing: nothing runs and the UI shows "not configured". */
  collector: Collector<T> | null;
  alerts(data: T): IntegrationAlert[];
}

export interface IntegrationContext {
  serviceId: string;
  serviceName: string;
  serviceUrl: string | null;
  baseUrl: string;
  secret: string | undefined;
  t: Translator;
}
