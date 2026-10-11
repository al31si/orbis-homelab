import { defineMessages } from '../../../../shared/i18n.js';

/** Server-generated texts (alerts, events, source labels). Keys must start with 'alerts.'. */
export const alerts = defineMessages({
  'alerts.resolved': (p: { title: string }) => `Risolto: ${p.title}`,
  'alerts.startupTitle': (p: { name: string }) => `${p.name} avviato`,
  'alerts.startupDetail': (p: { version: string }) => `Versione ${p.version}`,

  'alerts.sourceSystem': 'Sistema',
  'alerts.sourceContainers': 'Container',
  'alerts.sourceStorage': 'Storage',
  'alerts.sourceSmart': 'Report SMART',
  'alerts.sourceProbes': 'Probe servizi',

  'alerts.systemDownTitle': 'Sorgente di sistema non raggiungibile',
  'alerts.systemDownDetail':
    'Metriche host e stato dei container non disponibili: i dati mostrati non sono aggiornati.',
  'alerts.memoryTitle': 'Memoria quasi esaurita',
  'alerts.memoryDetail': (p: { available: number; used: number }) =>
    `RAM disponibile ${Math.round(p.available)}% (${Math.round(p.used)}% in uso).`,
  'alerts.swapTitle': 'Swap molto usato con poca RAM libera',
  'alerts.swapDetail': (p: { swap: number; available: number }) =>
    `Swap al ${Math.round(p.swap)}% e RAM disponibile ${Math.round(p.available)}%.`,
  'alerts.loadTitle': 'Carico elevato e prolungato',
  'alerts.loadDetail': (p: { load: number; cores: number }) =>
    `Load medio a 15 min ${p.load.toFixed(1)} su ${p.cores} core.`,
  'alerts.temperatureTitle': 'Temperatura CPU elevata',
  'alerts.temperatureDetail': (p: { label: string; celsius: number }) =>
    `${p.label}: ${Math.round(p.celsius)} °C.`,

  'alerts.smartDownTitle': 'Report SMART non disponibile',
  'alerts.smartDownDetail': 'Impossibile leggere il report di salute dei dischi.',
  'alerts.smartStaleTitle': 'Report SMART non aggiornato',
  'alerts.smartStaleDetail': (p: { minutes: number }) =>
    p.minutes === 1 ? 'Ultimo controllo 1 minuto fa.' : `Ultimo controllo ${p.minutes} minuti fa.`,
  'alerts.diskCritical': (p: { label: string }) => `${p.label}: disco critico`,
  'alerts.diskWarning': (p: { label: string }) => `${p.label}: disco da controllare`,
  'alerts.diskDetail': (p: { message: string; temperatureC: number | null }) =>
    `${p.message || 'Stato SMART anomalo'}${p.temperatureC === null ? '' : ` · ${p.temperatureC} °C`}`,
  'alerts.poolTitle': (p: { label: string }) => `Pool ${p.label} quasi pieno`,
  'alerts.poolDetail': (p: { label: string; percent: number }) =>
    `Pool ${p.label} al ${Math.round(p.percent)}% di utilizzo.`,
  'alerts.volumeTitle': (p: { mount: string }) => `Filesystem ${p.mount} quasi pieno`,
  'alerts.volumeDetail': (p: { mount: string; percent: number }) =>
    `${p.mount} al ${Math.round(p.percent)}% di utilizzo.`,

  'alerts.serviceDown': (p: { name: string }) => `${p.name} offline`,
  'alerts.serviceDegraded': (p: { name: string }) => `${p.name} degradato`,
  'alerts.containerTitle': (p: { name: string; state: string }) =>
    `Container ${p.name}: ${p.state}`,
  'alerts.containerDetail': 'Container non presente nel catalogo servizi.',

  'alerts.integrationDownTitle': (p: { label: string }) => `Integrazione ${p.label} non risponde`,
  'alerts.integrationDownDetail': (p: { error: string }) =>
    `Il servizio risponde ma la sua API no (${p.error}). Controlla la credenziale.`,
  'alerts.extensionFailedTitle': (p: { id: string }) => `Estensione ${p.id} in errore`,
});
