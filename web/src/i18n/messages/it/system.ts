import { defineMessages } from '@shared/i18n';

/** Keys must start with 'system.'. Italian is the reference dictionary. */
export const system = defineMessages({
  // page
  'system.title': 'Sistema',
  'system.tabs.label': 'Sezione',
  'system.tabs.resources': 'Risorse',
  'system.tabs.docker': 'Docker',
  'system.loading': 'Caricamento',
  'system.retry': 'Riprova',
  'system.stale': 'Dati non aggiornati',
  'system.offline.title': (p: { name: string }) => `${p.name} non raggiungibile`,
  'system.offline.description':
    'Non ci sono ancora dati salvati su questo dispositivo. Riproverò appena la connessione torna.',
  'system.error.system': 'Dati di sistema non disponibili',
  'system.error.containers': 'Elenco container non disponibile',
  'system.section.docker': 'Docker',
  'system.section.containers': 'Container',

  // host
  'system.host.title': 'Host',
  'system.host.host': 'Nome',
  'system.host.uptime': 'Attivo da',
  'system.host.os': 'Sistema',
  'system.host.kernel': 'Kernel',
  'system.host.cores': 'Core',

  // shared by the charts
  'system.stats.avg': (p: { value: string }) => `media ${p.value}`,
  'system.stats.peak': (p: { value: string }) => `picco ${p.value}`,
  'system.chart.label': (p: { label: string }) => `Andamento ${p.label}`,
  'system.chart.summary': (p: {
    label: string;
    span: string;
    min: string;
    max: string;
    now: string;
  }) => `${p.label} negli ultimi ${p.span}: minimo ${p.min}, massimo ${p.max}, ora ${p.now}.`,
  'system.chart.ago': (p: { span: string }) => `${p.span} fa`,
  'system.chart.now': 'adesso',

  // cpu
  'system.cpu.title': 'CPU',
  'system.cpu.inUse': (p: { cores: number }) => `in uso su ${p.cores} core`,
  'system.cpu.user': 'Utente',
  'system.cpu.system': 'Sistema',
  'system.cpu.iowait': 'Attesa I/O',
  'system.cpu.breakdown': "Ripartizione dell'uso della CPU",
  'system.cpu.chartLabel': 'Grafico CPU',
  'system.cpu.metricUsage': 'Utilizzo',
  'system.cpu.metricLoad': 'Carico',
  'system.cpu.usageSeries': 'Utilizzo CPU',
  'system.cpu.loadSeries': 'Carico medio a 1 minuto',
  'system.cpu.loadTitle': 'Carico medio',
  'system.cpu.loadScale': (p: { cores: number }) => `${p.cores} core = scala piena`,
  'system.cpu.window': (p: { minutes: number }) => `${p.minutes} min`,
  'system.cpu.loadAt': (p: { window: string }) => `Carico a ${p.window}`,
  'system.cpu.perCore': 'Per core',
  'system.cpu.core': (p: { n: number }) => `Core ${p.n}`,

  // memory
  'system.memory.title': 'Memoria',
  'system.memory.used': 'In uso',
  'system.memory.usedText': (p: { value: string }) => `In uso ${p.value}`,
  'system.memory.cache': 'Cache recuperabile',
  'system.memory.cacheText': (p: { value: string }) => `Cache ${p.value}`,
  'system.memory.free': 'Libera',
  'system.memory.freeText': (p: { value: string }) => `Libera ${p.value}`,
  'system.memory.ofTotal': (p: { used: string; total: string }) => `${p.used} di ${p.total}`,
  'system.memory.availableOf': (p: { value: string }) => `${p.value} disponibili`,
  'system.memory.series': 'Uso della memoria',
  'system.swap.title': 'Swap',
  'system.swap.usage': (p: { used: string; total: string }) => `${p.used} di ${p.total}`,
  'system.swap.none': 'Non configurata',
  'system.swap.bar': 'Swap usata',
  'system.swap.lowMemory.title': 'RAM disponibile molto bassa',
  'system.swap.lowMemory.text': (p: { critical: number }) =>
    `Resta meno del ${p.critical}% di RAM: il sistema potrebbe terminare dei processi.`,
  'system.swap.pressure.title': 'Swap quasi piena e poca RAM',
  'system.swap.pressure.text': (p: { swap: number; low: number }) =>
    `La swap è all’${p.swap}% o più e la RAM disponibile è sotto il ${p.low}%: il disco sta facendo da memoria.`,
  'system.swap.normal.title': 'Swap alta, ma normale',
  'system.swap.normal.text': (p: { critical: number; low: number; swap: number }) =>
    `Linux sposta in swap le pagine poco usate anche con RAM libera. Ti avviso solo se la RAM disponibile scende sotto il ${p.critical}%, o sotto il ${p.low}% con la swap all’${p.swap}% o più.`,

  // temperature
  'system.temperature.title': 'Temperatura',
  'system.temperature.empty': 'Nessun sensore di temperatura disponibile.',
  'system.temperature.cores': 'Core CPU',
  'system.temperature.others': 'Altri sensori',
  'system.temperature.ok': 'Normale',
  'system.temperature.warn': 'Elevata',
  'system.temperature.crit': 'Critica',
  'system.temperature.noLimits': 'Senza limiti',
  'system.temperature.warnAt': (p: { value: string }) => `attenzione a ${p.value}`,
  'system.temperature.critAt': (p: { value: string }) => `critica a ${p.value}`,
  'system.temperature.limits': (p: { parts: string }) => `Soglie: ${p.parts}.`,

  // disk I/O
  'system.diskIo.title': 'I/O disco',
  'system.diskIo.empty': 'Nessun dato di I/O disponibile.',
  'system.diskIo.list': 'Velocità di lettura e scrittura per disco',
  'system.diskIo.colDisk': 'Disco',
  'system.diskIo.read': 'Lettura',
  'system.diskIo.write': 'Scrittura',

  // docker
  'system.docker.runningOf': (p: { total: string }) => `su ${p.total}`,
  'system.docker.running': 'container in esecuzione',
  'system.docker.runningBar': 'Container in esecuzione',
  'system.docker.summary': (p: { healthy: number; unhealthy: number; starting: number }) => {
    const parts = [
      p.healthy > 0 && `${p.healthy} ${p.healthy === 1 ? 'sano' : 'sani'}`,
      p.unhealthy > 0 && `${p.unhealthy} non ${p.unhealthy === 1 ? 'sano' : 'sani'}`,
      p.starting > 0 && `${p.starting} in avvio`,
    ].filter(Boolean);
    return parts.length > 0 ? `${parts.join(', ')}.` : 'Nessun controllo di salute attivo.';
  },
  'system.docker.traffic': 'Traffico dei container',
  'system.docker.received': 'in ricezione',
  'system.docker.sent': 'in invio',
  'system.docker.trafficNote': 'Somma dei container, non della scheda di rete dell’host.',

  // containers
  'system.state.healthy': 'Sano',
  'system.state.running': 'In esecuzione',
  'system.state.starting': 'In avvio',
  'system.state.unhealthy': 'Non sano',
  'system.state.paused': 'In pausa',
  'system.state.restarting': 'Riavvio in corso',
  'system.state.exited': 'Terminato',
  'system.state.dead': 'Non attivo',
  'system.state.unknown': 'Sconosciuto',
  'system.containers.sortState': 'Stato',
  'system.containers.sortCpu': 'CPU',
  'system.containers.sortMemory': 'RAM',
  'system.containers.sortName': 'Nome',
  'system.containers.sortLabel': 'Ordina container per',
  'system.containers.search': 'Cerca container o servizio',
  'system.containers.all': 'Tutti',
  'system.containers.problems': 'Con problemi',
  'system.containers.none': 'Nessun container trovato.',
  'system.containers.allFine': 'Nessun container con problemi: tutto in ordine.',
  'system.containers.noMatch': 'Nessun container corrisponde alla ricerca.',
  'system.containers.list': 'Container',
  'system.containers.colContainer': 'Container',
  'system.containers.colCpu': 'CPU',
  'system.containers.colMemory': 'Memoria',
  'system.containers.colUptime': 'Attivo da',

  /**
   * A container uptime as reported by the source ("2 mins", "a week"): `unit` is the normalised
   * unit, `n` its amount and `text` the original phrase. Languages that need no translation
   * return `text`.
   */
  'system.uptime': (p: {
    unit: 'sec' | 'min' | 'hour' | 'day' | 'week' | 'month' | 'year';
    n: number;
    text: string;
  }) => {
    const one = p.n === 1;
    const units = {
      sec: 's',
      min: 'min',
      hour: 'h',
      day: 'g',
      week: 'sett',
      month: one ? 'mese' : 'mesi',
      year: one ? 'anno' : 'anni',
    } as const;
    return `${p.n}\u00a0${units[p.unit]}`;
  },
});
