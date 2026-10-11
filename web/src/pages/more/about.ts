import type { Session } from '@shared/api';
import { t } from '@/i18n';

export interface AccessSummary {
  /** "Full access" / "Limited access". */
  label: string;
  /** Subtle lines under the label: how access is decided, who the user is, what is missing. */
  details: string[];
}

/** How the current session is trusted, in the instance language (shown in Settings). */
export function accessSummary(
  session: Pick<Session, 'access' | 'accessMode' | 'user'>,
): AccessSummary {
  const details = [t(`more.about.mode.${session.accessMode}`)];
  const person = session.user?.name ?? session.user?.login;
  if (person) details.push(person);
  if (session.access === 'limited') details.push(t('more.about.accessLimitedHint'));
  return {
    label: t(session.access === 'full' ? 'more.about.accessFull' : 'more.about.accessLimited'),
    details,
  };
}
