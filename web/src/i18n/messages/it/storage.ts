import { defineMessages } from '@shared/i18n';

/** Keys must start with 'storage.'. Italian is the reference dictionary. */
export const storage = defineMessages({
  // page
  'storage.title': 'Storage',
  'storage.loading': 'Caricamento',
  'storage.retry': 'Riprova',
  'storage.stale': 'Dati non aggiornati',
  'storage.offline.title': (p: { name: string }) => `${p.name} non raggiungibile`,
  'storage.offline.description':
    'Non ci sono ancora dati salvati su questo dispositivo. Riproverò appena la connessione torna.',
  'storage.error': 'Dati di storage non disponibili',
  'storage.empty.title': 'Nessun dato di storage',
  'storage.empty.description': 'Non è stato rilevato nessun volume o disco da mostrare.',
  'storage.summary.volumes': (p: { n: number }) => (p.n === 1 ? '1 volume' : `${p.n} volumi`),
  'storage.summary.disks': (p: { n: number }) => (p.n === 1 ? '1 disco' : `${p.n} dischi`),

  // usage verdicts (pools and volumes)
  'storage.verdict.critical': 'Spazio quasi esaurito',
  'storage.verdict.warn': 'Spazio in esaurimento',
  'storage.verdict.ok': 'Capienza in ordine',

  // pools
  'storage.pool.section': 'Pool',
  'storage.pool.sectionMany': 'Pool',
  'storage.pool.usage': 'usato',
  'storage.pool.usedOf': (p: { used: string; total: string }) => `${p.used} di ${p.total}`,
  'storage.pool.used': 'Usato',
  'storage.pool.free': 'Libero',
  'storage.pool.total': 'Totale',
  'storage.pool.gauge': 'Spazio usato del pool',
  'storage.pool.share': 'Spazio usato per volume',
  'storage.pool.shareText': (p: { name: string; size: string; percent: string }) =>
    `${p.name} ${p.size}, ${p.percent} dello spazio usato`,

  // volumes
  'storage.volumes.section': 'Volumi',
  'storage.volume.usage': (p: { name: string }) => `Spazio usato su ${p.name}`,
  'storage.volume.usedOf': (p: { used: string; total: string }) => `${p.used} di ${p.total}`,
  'storage.volume.free': 'liberi',

  // disk health
  'storage.status.OK': 'In salute',
  'storage.status.WARNING': 'Attenzione',
  'storage.status.CRITICAL': 'Critico',
  'storage.health.section': 'Salute dischi',
  'storage.health.allHealthy': 'Tutti i dischi in salute',
  'storage.health.check': 'Alcuni dischi richiedono attenzione',
  'storage.health.critical': 'Almeno un disco è in stato critico',
  'storage.health.lastCheck': 'Ultima verifica SMART',
  'storage.health.staleTitle': 'Report SMART non aggiornato',
  'storage.health.staleText': (p: { minutes: number }) =>
    `Il report non si aggiorna da più di ${p.minutes} minuti: lo stato dei dischi mostrato qui potrebbe essere superato.`,
  'storage.health.unavailableAll': 'Dati SMART non disponibili',
  'storage.health.unavailableSome': (p: { names: string }) =>
    `Dati SMART non disponibili per ${p.names}`,
  'storage.health.unavailableText':
    'Il report non contiene le letture SMART di questi dischi: temperatura e contatori non possono essere valutati.',
  'storage.health.meaningsSummary': 'Cosa significano questi valori',
  'storage.health.advice':
    'Il disco può continuare a funzionare a lungo, ma è un segnale precoce di usura: conviene verificare di avere un backup aggiornato dei dati importanti.',
  'storage.health.smartState': (p: { state: string }) => `Stato SMART: ${p.state}`,

  // SMART counters
  'storage.counter.reallocated': 'Riallocati',
  'storage.counter.pending': 'Pending',
  'storage.counter.uncorrectable': 'Non correggibili',
  'storage.counter.smartErrors': 'Errori SMART',
  'storage.counterInline.reallocated': 'riallocati',
  'storage.counterInline.pending': 'pending',
  'storage.counterInline.uncorrectable': 'non correggibili',
  'storage.counterInline.smartErrors': 'errori SMART',
  'storage.meaning.pending':
    'Un settore pending è un blocco che il disco non riesce a leggere in modo affidabile: resta in attesa di essere riscritto o sostituito.',
  'storage.meaning.uncorrectable':
    'Un settore non correggibile è un blocco che il disco non ha saputo leggere nemmeno con la correzione degli errori: i dati in quel punto possono essere persi.',
  'storage.meaning.reallocated':
    'Un settore riallocato è un blocco difettoso sostituito da uno di riserva. Pochi sono normali, ma se crescono nel tempo indicano usura.',
  'storage.meaning.smartErrors':
    'Gli errori SMART sono anomalie registrate dal disco nel proprio registro interno.',
  'storage.meaning.failed':
    'Il verdetto SMART complessivo è «fallito»: il disco segnala un guasto imminente.',
  'storage.meaning.passed':
    'Il verdetto SMART complessivo è «superato»: il disco non dichiara un guasto imminente, ma i contatori mostrano settori problematici.',

  // disks
  'storage.disks.list': 'Dischi',
  'storage.disks.serial': (p: { tail: string }) => `Seriale …${p.tail}`,
  'storage.disks.unverified': 'Non verificato',
  'storage.disks.smart': 'SMART',
  'storage.disks.temperature': 'Temperatura',
  'storage.disks.temperatureMeter': (p: { name: string }) => `Temperatura di ${p.name}`,
  'storage.disks.powerOn': 'Ore accese',
  'storage.disks.hours': (p: { n: string }) => `${p.n} h`,
  'storage.disks.countersClean': 'Nessun settore difettoso né errore SMART',
  'storage.disks.limits': (p: { warn: string; crit: string }) =>
    `Temperatura: attenzione da ${p.warn}, critica da ${p.crit}.`,
  'storage.smart.PASSED': 'Superato',
  'storage.smart.FAILED': 'Fallito',
  'storage.smart.UNAVAILABLE': 'Non disponibile',
  'storage.span.days': (p: { n: number }) => `${p.n} ${p.n === 1 ? 'giorno' : 'giorni'}`,
  'storage.span.years': (p: { n: number }) => `${p.n} ${p.n === 1 ? 'anno' : 'anni'}`,
  'storage.span.yearsAndDays': (p: { years: string; days: string }) => `${p.years} e ${p.days}`,
});
