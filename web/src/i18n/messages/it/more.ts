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
  'more.install.insecure.title': 'Serve l’indirizzo HTTPS',
  'more.install.insecure.text': (p: { name: string }) =>
    `Installazione completa, uso offline e notifiche richiedono l’indirizzo HTTPS. Da questo indirizzo ${p.name} funziona solo come sito web.`,
  'more.install.noSecureUrl':
    'L’indirizzo HTTPS non è ancora configurato sul server (`publicUrl` in `config.yaml`).',
  'more.install.prompt.title': (p: { name: string }) => `Installa ${p.name}`,
  'more.install.prompt.text':
    'Aggiungilo alla schermata Home per aprirlo come un’app, a schermo intero.',
  'more.install.prompt.button': 'Installa',
  'more.install.ios.title': 'Aggiungi alla schermata Home',
  'more.install.ios.text': (p: { name: string }) =>
    `Da Safari, così ${p.name} si apre come un’app.`,
  'more.install.ios.step1': 'Tocca **Condividi**',
  'more.install.ios.step1After': 'nella barra di Safari',
  'more.install.ios.step2': 'Scegli **Aggiungi alla schermata Home**',
  'more.install.ios.step3': (p: { name: string }) =>
    `Tocca **Aggiungi** e apri ${p.name} dall’icona`,
  'more.install.browser.title': 'Installazione dal browser',
  'more.install.browser.text':
    'Cerca “Installa app” o “Aggiungi alla schermata Home” nel menu del browser. Non tutti i browser lo permettono.',

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
  'more.notifications.insecure.title': 'Serve l’indirizzo HTTPS',
  'more.notifications.insecure.text': (p: { name: string }) =>
    `Le notifiche funzionano solo dall’indirizzo HTTPS di ${p.name}, indicato nella sezione Installazione.`,
  'more.notifications.needsInstall.title': 'Installa prima l’app',
  'more.notifications.needsInstall.text': (p: { name: string }) =>
    `Su iPhone e iPad le notifiche funzionano solo con ${p.name} installata: aggiungila alla schermata Home e aprila da lì.`,
  'more.notifications.unsupported.title': 'Notifiche non supportate',
  'more.notifications.unsupported.text': 'Questo browser non supporta le notifiche push.',
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
    'Il servizio push del browser non è raggiungibile. Riprova tra poco.',
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
