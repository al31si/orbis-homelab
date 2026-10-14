import { defineMessages } from '@shared/i18n';

/**
 * Keys must start with 'more.'. Italian is the reference dictionary.
 * Messages shown through `RichText` may use `code` and **bold** markup.
 */
export const more = defineMessages({
  'more.title': 'Altro',
  'more.subtitle': (p: { name: string }) => `Impostazioni e strumenti di ${p.name}`,

  'more.appearance.title': 'Aspetto',
  'more.appearance.theme': 'Tema',
  'more.appearance.themeHint': 'Automatico segue le impostazioni del dispositivo.',
  'more.appearance.themeAuto': 'Automatico',
  'more.appearance.themeLight': 'Chiaro',
  'more.appearance.themeDark': 'Scuro',
  'more.appearance.showNoUi': 'Mostra servizi senza interfaccia',
  'more.appearance.showNoUiHint': 'Elenca anche i servizi che non hanno una pagina web.',

  'more.install.title': 'Installazione',
  'more.install.installed.title': 'App installata',
  'more.install.installed.text': (p: { name: string }) =>
    `Stai usando ${p.name} come app sul tuo dispositivo.`,
  'more.install.elsewhere.title': 'Già installata su questo dispositivo',
  'more.install.elsewhere.text': (p: { name: string }) =>
    `Apri ${p.name} dalle tue app o dalla schermata Home. Se l’hai rimossa, puoi installarla di nuovo.`,
  'more.install.elsewhere.show': 'Mostra i passaggi',
  'more.install.prompt.title': (p: { name: string }) => `Installa ${p.name}`,
  'more.install.prompt.text':
    'Il browser può installarla come app, con una finestra e un’icona proprie.',
  'more.install.prompt.button': 'Installa',

  'more.install.kind.chromium-desktop.title': (p: { name: string }) =>
    `Installa ${p.name} come app`,
  'more.install.kind.chromium-android.title': 'Aggiungi alla schermata Home',
  'more.install.kind.ios.title': 'Aggiungi alla schermata Home',
  'more.install.kind.mac-safari.title': 'Aggiungi al Dock',
  'more.install.kind.firefox-desktop.title': 'Firefox non installa le app web sul computer',
  'more.install.kind.firefox-android.title': 'Aggiungi alla schermata Home',
  'more.install.kind.in-app-browser.title': 'Apri questa pagina nel browser',
  'more.install.kind.generic.title': 'Installa dal menu del browser',

  'more.install.result.app': (p: { name: string }) =>
    `${p.name} si apre in una finestra propria o da un’icona, come un’app.`,
  'more.install.result.window': (p: { name: string }) =>
    `${p.name} si apre in una finestra propria, come un’app.`,
  'more.install.result.shortcut':
    'Aggiunge un collegamento che si apre nel browser, non come app separata.',
  'more.install.none.firefox-desktop':
    'Aggiungi la pagina ai segnalibri o fissa la scheda (clic destro sulla scheda, **Fissa scheda**). Per usarla in una finestra propria aprila con Chrome, Edge, Brave o Safari.',
  'more.install.none.in-app-browser':
    'Questo browser non ha “Aggiungi alla schermata Home”. Apri prima questo indirizzo in Safari, o nel tuo browser abituale.',
  'more.install.none.generic':
    'Cerca “Installa”, “Aggiungi alla schermata Home” o “Crea collegamento” nel menu del browser. Se non c’è, aggiungi la pagina ai segnalibri.',

  'more.install.step.chromium.chrome.secure':
    'Clicca **Installa** all’estremità della barra degli indirizzi, oppure apri il menu **⋮** e scegli **Trasmetti, salva e condividi** → **Installa pagina come app…**',
  'more.install.step.chromium.chrome.insecure':
    'Apri il menu **⋮** e scegli **Trasmetti, salva e condividi** → **Installa pagina come app…**',
  'more.install.step.chromium.edge.secure':
    'Clicca **App disponibile** nella barra degli indirizzi, oppure apri **Impostazioni e altro ancora (…)** → **Altri strumenti** → **App** e scegli la voce che installa il sito come app (in inglese **Install this site as an app**)',
  'more.install.step.chromium.edge.insecure':
    'Apri **Impostazioni e altro ancora (…)** → **Altri strumenti** → **App** e scegli la voce che installa il sito come app (in inglese **Install this site as an app**)',
  'more.install.step.chromium.brave.secure':
    'Clicca **Installa** nella barra degli indirizzi, oppure apri il menu → **Salva e condividi** → **Installa pagina come app…**',
  'more.install.step.chromium.brave.insecure':
    'Apri il menu → **Salva e condividi** → **Installa pagina come app…**',
  'more.install.step.chromium.other.secure':
    'Cerca **Installa…** nella barra degli indirizzi o nel menu del browser',
  'more.install.step.chromium.other.insecure':
    'Nel menu del browser cerca **Installa pagina come app…** o una voce simile che installa il sito come app',
  'more.install.step.chromium.confirm': (p: { name: string }) =>
    `Conferma, poi apri ${p.name} dalla nuova icona`,
  'more.install.step.android.secure':
    'Apri il menu del browser **⋮** e tocca **Installa app** (oppure **Aggiungi a schermata Home**)',
  'more.install.step.android.insecure':
    'Apri il menu del browser **⋮** e tocca **Aggiungi a schermata Home** (oppure **Crea collegamento**)',
  'more.install.step.android.confirm': (p: { name: string }) =>
    `Conferma, poi apri ${p.name} dall’icona`,
  'more.install.step.firefox-android':
    'Apri il menu di Firefox e scegli **Installa** oppure **Aggiungi alla schermata Home**',
  'more.install.step.mac.menu': 'In Safari scegli **File** → **Aggiungi al Dock…**',
  'more.install.step.mac.confirm': (p: { name: string }) =>
    `Clicca **Aggiungi**, poi apri ${p.name} dal Dock o da Launchpad`,
  'more.install.ios.step1': 'Apri il menu **Condividi**',
  'more.install.ios.step1After': 'del browser',
  'more.install.ios.step2': 'Scegli **Aggiungi alla schermata Home**',
  'more.install.ios.step3': (p: { name: string }) =>
    `Lascia attivo **Apri come app web**, tocca **Aggiungi**, poi apri ${p.name} dall’icona`,

  'more.install.note.chromium-desktop.insecure':
    'I nomi dei menu cambiano con la lingua e la versione del browser.',
  'more.install.note.chromium-desktop.secure':
    'I nomi dei menu cambiano con la lingua e la versione del browser.',
  'more.install.note.chromium-android.insecure':
    'Da un indirizzo HTTP il collegamento si apre nel browser. Un’app vera (finestra propria, uso offline, notifiche) richiede un indirizzo sicuro, vedi sotto.',
  'more.install.note.chromium-android.secure':
    'Chrome e Samsung Internet la installano come app vera; gli altri browser aggiungono un collegamento.',
  'more.install.note.firefox-android':
    'Firefox aggiunge un collegamento che si apre in Firefox, non un’app separata.',
  'more.install.note.mac':
    'Serve Safari 17 su macOS Sonoma (14) o successivo. Il nome dei comandi dipende dalla lingua.',
  'more.install.note.ios.insecure':
    'Da un indirizzo HTTP si apre come app, ma uso offline e notifiche richiedono un indirizzo sicuro, vedi sotto.',
  'more.install.note.ios.secure':
    'Le notifiche su iPhone e iPad funzionano solo con l’app aggiunta alla schermata Home.',

  'more.install.here.title': 'Su questo indirizzo',
  'more.install.cap.installs.title': 'Si installa come',
  'more.install.cap.installs.app':
    'Un’app vera: finestra o icona proprie, con uso offline e notifiche.',
  'more.install.cap.installs.window':
    'Una finestra di app. Questo indirizzo è HTTP semplice: niente modalità offline né notifiche.',
  'more.install.cap.installs.window-without-worker':
    'Per ora una finestra di app: il browser ha rifiutato il service worker (vedi sotto), quindi niente uso offline né notifiche.',
  'more.install.cap.installs.shortcut': 'Un collegamento che si apre nel browser.',
  'more.install.cap.installs.none': 'Niente: questo browser non installa app web.',
  'more.install.cap.offline.title': 'Uso offline',
  'more.install.cap.offline.ready':
    'Pronto: l’app si apre anche senza connessione e mostra gli ultimi dati che ha.',
  'more.install.cap.offline.preparing':
    'In preparazione: ricarica la pagina una volta e ricontrolla.',
  'more.install.cap.offline.needs-https': 'Serve un indirizzo sicuro (HTTPS).',
  'more.install.cap.offline.failed':
    'Il browser ha rifiutato il service worker. Su HTTPS di solito il certificato non è considerato attendibile da questo dispositivo: vedi la guida HTTPS.',
  'more.install.cap.offline.unsupported': 'Questo browser non supporta i service worker.',
  'more.install.cap.offline.development': 'Disattivato nel server di sviluppo.',
  'more.install.cap.notifications.title': 'Notifiche',
  'more.install.cap.notifications.available':
    'Pronte da attivare: usa la sezione Notifiche qui sotto.',
  'more.install.cap.notifications.active': 'Attive su questo dispositivo.',
  'more.install.cap.notifications.checking': 'Verifica in corso…',
  'more.install.cap.notifications.error': 'Non riesco a leggere lo stato dal server.',
  'more.install.cap.notifications.unsupported': 'Questo browser non supporta le notifiche push.',
  'more.install.cap.notifications.worker-failed':
    'Il browser ha rifiutato il service worker, quindi non sono attivabili.',
  'more.install.cap.notifications.limited':
    'Servono i permessi completi: con accesso limitato sono disattivate.',
  'more.install.cap.notifications.denied':
    'Il browser le ha bloccate per questo sito: riattivale dalle sue impostazioni.',
  'more.install.cap.notifications.needs-https': 'Serve un indirizzo sicuro (HTTPS).',
  'more.install.cap.notifications.server-off':
    'Disattivate su questo server (`push.enabled` in `config.yaml`).',
  'more.install.cap.notifications.install-first':
    'Su iPhone e iPad installa prima l’app, poi attivale da lì.',

  'more.install.https.title': 'Indirizzo sicuro',
  'more.install.https.heading': 'Sblocca uso offline e notifiche',
  'more.install.https.text':
    'Serve un indirizzo HTTPS. Per l’uso di ogni giorno non è necessario: scegli la strada più adatta a te.',
  'more.install.https.opt.tailscale.title': 'Tailscale',
  'more.install.https.opt.tailscale.desc':
    'Indirizzo HTTPS privato per i tuoi dispositivi, con un solo comando.',
  'more.install.https.opt.proxy.title': 'Il tuo reverse proxy',
  'more.install.https.opt.proxy.desc': 'Hai già Caddy, Nginx o Traefik? Aggiungi Orbis lì.',
  'more.install.https.opt.caddy.title': 'Caddy con un dominio',
  'more.install.https.opt.caddy.desc': 'Certificati gratuiti che si rinnovano da soli.',
  'more.install.https.opt.local-ca.title': 'Solo rete di casa',
  'more.install.https.opt.local-ca.desc':
    'Autorità di certificazione locale: ogni dispositivo la accetta una volta.',
  'more.install.https.opt.localhost.title': 'Solo questo computer',
  'more.install.https.opt.localhost.desc': 'Aprila come localhost, per esempio con un tunnel SSH.',
  'more.install.https.guide': 'Tutte le opzioni e la guida',
  'more.install.https.secureUrl.text': (p: { name: string }) =>
    `Apri ${p.name} da questo indirizzo per installarla come app vera.`,
  'more.install.https.recommended': 'Consigliato: installa dall’indirizzo sicuro',
  'more.install.https.orHere': 'Oppure installa da questo indirizzo',

  'more.secure.open': 'Apri',
  'more.secure.copy': 'Copia',
  'more.secure.copied': 'Indirizzo copiato',
  'more.secure.copyFailed': 'Copia non riuscita: seleziona l’indirizzo a mano',

  'more.notifications.title': 'Notifiche',
  'more.notifications.heading': 'Notifiche push',
  'more.notifications.checking': 'Verifica delle notifiche',
  'more.notifications.error.title': 'Stato non disponibile',
  'more.notifications.error.text': (p: { name: string }) =>
    `Non riesco a leggere lo stato delle notifiche da ${p.name}.`,
  'more.notifications.inactive.title': 'Notifiche non attive',
  'more.notifications.inactive.text': 'Attivale per ricevere un avviso su questo dispositivo.',
  'more.notifications.active.title': 'Notifiche attive',
  'more.notifications.active.text': 'Questo dispositivo riceverà gli avvisi critici.',
  'more.notifications.insecure.title': 'Serve un indirizzo sicuro',
  'more.notifications.insecure.text':
    'Le notifiche richiedono HTTPS: vedi la sezione Installazione qui sopra.',
  'more.notifications.needsInstall.title': 'Installa prima l’app',
  'more.notifications.needsInstall.text': (p: { name: string }) =>
    `Su iPhone e iPad le notifiche funzionano solo con ${p.name} installata: aggiungila alla schermata Home e aprila da lì.`,
  'more.notifications.unsupported.title': 'Notifiche non supportate',
  'more.notifications.unsupported.text': 'Questo browser non supporta le notifiche push.',
  'more.notifications.workerFailed.title': 'Service worker rifiutato',
  'more.notifications.workerFailed.text':
    'Il browser ha rifiutato il service worker, di solito perché non si fida del certificato HTTPS. Senza non si possono attivare le notifiche: vedi la guida HTTPS.',
  'more.notifications.limited.title': 'Serve l’accesso completo',
  'more.notifications.limited.text':
    'Le notifiche sono disponibili solo con l’accesso completo: con l’accesso limitato sono disattivate.',
  'more.notifications.unavailable.title': 'Notifiche non configurate',
  'more.notifications.unavailable.text':
    'Il server non ha le chiavi necessarie per inviare notifiche.',
  'more.notifications.denied.title': 'Permesso negato',
  'more.notifications.denied.text': (p: { name: string }) =>
    `Hai bloccato le notifiche di ${p.name}. Riabilitale dalle impostazioni del browser o del dispositivo (su iPhone: Impostazioni › Notifiche › ${p.name}), poi torna qui.`,
  'more.notifications.enable': 'Attiva notifiche',
  'more.notifications.test': 'Invia notifica di prova',
  'more.notifications.disable': 'Disattiva',
  'more.notifications.retry': 'Riprova',
  'more.notifications.enabled': 'Notifiche attivate su questo dispositivo',
  'more.notifications.disabled': 'Notifiche disattivate su questo dispositivo',
  'more.notifications.sent': (p: { n: number }) =>
    p.n === 1 ? 'Notifica inviata a 1 dispositivo' : `Notifica inviata a ${p.n} dispositivi`,
  'more.notifications.sentNone': 'Nessun dispositivo raggiunto dalla notifica',
  'more.notifications.note':
    'Ricevi una notifica solo per gli avvisi critici, ad esempio un disco in errore o un servizio essenziale offline.',
  'more.notifications.devices': (p: { n: number }) =>
    p.n === 0
      ? 'Nessun dispositivo registrato'
      : p.n === 1
        ? '1 dispositivo registrato'
        : `${p.n} dispositivi registrati`,

  'more.pushError.noServiceWorker':
    'Il service worker non è attivo: apri l’app dall’indirizzo HTTPS e riprova.',
  'more.pushError.permissionDenied': (p: { name: string }) =>
    `Permesso negato: abilita le notifiche per ${p.name} dalle impostazioni.`,
  'more.pushError.permissionDismissed':
    'Permesso non concesso: tocca di nuovo “Attiva” e consenti le notifiche.',
  'more.pushError.incompleteSubscription': 'Il browser ha restituito un’iscrizione incompleta.',
  'more.pushError.notConfigured': 'Il server non ha le notifiche configurate.',
  'more.notifications.help': 'Le notifiche non funzionano? Guida alla risoluzione',
  'more.pushError.unreachable': (p: { name: string }) =>
    `${p.name} non è raggiungibile. Riprova tra poco.`,
  'more.pushError.forbidden': 'Accesso non consentito: le notifiche richiedono l’accesso completo.',
  'more.pushError.tooManyDevices':
    'Troppi dispositivi registrati: rimuovine uno prima di aggiungerne un altro.',
  'more.pushError.rejected': 'Il server ha rifiutato l’iscrizione di questo dispositivo.',
  'more.pushError.server': (p: { status: number | null }) =>
    `Il server ha risposto con un errore (${p.status ?? 'sconosciuto'}).`,
  'more.pushError.browserDenied': 'Il permesso per le notifiche è stato negato.',
  'more.pushError.pushService':
    'Il servizio push del browser non è raggiungibile. Riprova tra poco; se succede ancora, apri la guida qui sotto.',
  'more.pushError.generic': 'Impossibile completare l’operazione. Riprova.',

  'more.links.title': 'Collegamenti rapidi',

  'more.extensions.title': 'Estensioni',

  'more.about.title': 'Informazioni',
  'more.about.listLabel': (p: { name: string }) => `Informazioni su ${p.name}`,
  'more.about.appVersion': 'Versione app',
  'more.about.appVersionUnavailable': 'non disponibile',
  'more.about.appVersionDevelopment': 'sviluppo',
  'more.about.serverVersion': 'Versione server',
  'more.about.access': 'Accesso',
  'more.about.accessFull': 'Accesso completo',
  'more.about.accessLimited': 'Accesso limitato',
  'more.about.accessLimitedHint': 'Alcuni dati e le notifiche non sono disponibili',
  'more.about.mode.limited': 'Modalità limitata',
  'more.about.mode.trusted-network': 'Rete attendibile',
  'more.about.mode.identity-proxy': 'Identità tramite proxy',
  'more.about.diagnostics': 'Diagnostica',
  'more.about.diagnosticsHint': 'Fonti dati, server e questo dispositivo',
  'more.about.actions': 'Azioni',
  'more.about.refreshAll': 'Aggiorna tutti i dati',
  'more.about.refreshing': 'Aggiornamento in corso…',
  'more.about.refreshed': 'Dati aggiornati',
  'more.about.reload': 'Ricarica app',
  'more.about.reloadHint': 'Nuova versione pronta da installare',
  'more.notFound.title': 'Pagina non trovata',
  'more.notFound.heading': 'Questa pagina non esiste',
  'more.notFound.description': (p: { name: string }) =>
    `L’indirizzo non corrisponde a nessuna schermata di ${p.name}. Se è una pagina opzionale, potrebbe essere disattivata su questa installazione.`,
  'more.notFound.home': 'Torna alla Home',
});
