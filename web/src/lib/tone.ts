import type { ContainerState, OverallStatus, ServiceState, Severity, Tone } from '@shared/api';

/** Visual tone of a component: the API tones plus `info` for neutral highlights. */
export type UiTone = Tone | 'info';

export function toneForSeverity(severity: Severity): UiTone {
  return severity === 'critical' ? 'crit' : severity === 'warning' ? 'warn' : 'info';
}

export function toneForStatus(status: OverallStatus): UiTone {
  switch (status) {
    case 'ok':
      return 'ok';
    case 'warning':
      return 'warn';
    case 'critical':
      return 'crit';
    default:
      return 'neutral';
  }
}

export function toneForServiceState(state: ServiceState): UiTone {
  switch (state) {
    case 'up':
      return 'ok';
    case 'degraded':
      return 'warn';
    case 'down':
      return 'crit';
    default:
      return 'neutral';
  }
}

export function toneForContainerState(state: ContainerState): UiTone {
  switch (state) {
    case 'healthy':
    case 'running':
      return 'ok';
    case 'starting':
    case 'paused':
    case 'restarting':
      return 'warn';
    case 'unhealthy':
    case 'dead':
      return 'crit';
    default:
      return 'neutral';
  }
}

/** `ok` below `warn`, `warn` below `crit`, `crit` from there on. */
export function toneForThreshold(value: number, warn: number, crit: number): UiTone {
  return value >= crit ? 'crit' : value >= warn ? 'warn' : 'ok';
}
