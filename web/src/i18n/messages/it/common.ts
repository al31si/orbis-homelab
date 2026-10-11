import { defineMessages } from '@shared/i18n';

/** Keys must start with 'common.'. Italian is the reference dictionary. */
export const common = defineMessages({
  'common.close': 'Chiudi',
  'common.retry': 'Riprova',
  'common.loading': 'Caricamento…',

  'common.unit.day': 'g',
  'common.unit.hour': 'h',
  'common.unit.minute': 'min',
  'common.unit.second': 's',
  'common.time.now': 'adesso',
  'common.time.ago': (p: { value: string }) => `${p.value} fa`,
  'common.time.in': (p: { value: string }) => `tra ${p.value}`,

  'common.error.unreachable': 'Server non raggiungibile',
  'common.error.timeout': 'Il server non risponde',
  'common.error.http': (p: { status: number }) => `Errore ${p.status}`,
  'common.error.parse': 'Risposta non valida',
  'common.error.unexpected': 'Errore imprevisto',
});
