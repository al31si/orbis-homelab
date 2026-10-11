import type { AccessLevel, Session } from '../../../shared/api.js';

/** Result of resolving who is calling (see access.ts). */
export interface Access {
  level: AccessLevel;
  user: Session['user'];
}

export interface Logger {
  info: (msg: string) => void;
  warn: (obj: object, msg: string) => void;
  error: (obj: object, msg: string) => void;
}

/** Emitted by the alert engine; the edge turns it into a push notification. */
export interface AlertNotification {
  kind: 'raised' | 'cleared';
  alert: import('../../../shared/api.js').Alert;
}
