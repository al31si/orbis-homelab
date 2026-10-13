import type { Localized } from '@shared/i18n';
import type { more as ref } from '../it/more';

export const more: Localized<typeof ref> = {
  'more.title': 'More',
  'more.subtitle': (p) => `Settings and tools for ${p.name}`,

  'more.appearance.title': 'Appearance',
  'more.appearance.theme': 'Theme',
  'more.appearance.themeHint': 'Auto follows the device settings.',
  'more.appearance.themeAuto': 'Auto',
  'more.appearance.themeLight': 'Light',
  'more.appearance.themeDark': 'Dark',
  'more.appearance.showNoUi': 'Show services without a UI',
  'more.appearance.showNoUiHint': 'Also list services that have no web page.',

  'more.install.title': 'Installation',
  'more.install.installed.title': 'App installed',
  'more.install.installed.text': (p) => `You’re using ${p.name} as an app on this device.`,
  'more.install.elsewhere.title': 'Already installed on this device',
  'more.install.elsewhere.text': (p) =>
    `Open ${p.name} from your apps or your Home Screen. If you removed it, you can install it again.`,
  'more.install.elsewhere.show': 'Show the steps',
  'more.install.prompt.title': (p) => `Install ${p.name}`,
  'more.install.prompt.text':
    'Your browser can install it as an app, with its own window and icon.',
  'more.install.prompt.button': 'Install',

  'more.install.kind.chromium-desktop.title': (p) => `Install ${p.name} as an app`,
  'more.install.kind.chromium-android.title': 'Add to Home screen',
  'more.install.kind.ios.title': 'Add to Home Screen',
  'more.install.kind.mac-safari.title': 'Add to Dock',
  'more.install.kind.firefox-desktop.title': 'Firefox can’t install web apps on computers',
  'more.install.kind.firefox-android.title': 'Add to Home screen',
  'more.install.kind.in-app-browser.title': 'Open this page in your browser',
  'more.install.kind.generic.title': 'Install from the browser menu',

  'more.install.result.app': (p) =>
    `${p.name} opens in its own window or from an icon, like an app.`,
  'more.install.result.window': (p) =>
    `${p.name} opens in its own window, like an app. Offline use and notifications need a secure address, see below.`,
  'more.install.result.shortcut':
    'It adds a shortcut that opens in the browser, not as a separate app.',
  'more.install.none.firefox-desktop':
    'Bookmark this page, or pin the tab (right-click the tab, **Pin Tab**). To use it in its own window, open it in Chrome, Edge, Brave or Safari.',
  'more.install.none.in-app-browser':
    'This browser has no “Add to Home Screen”. Open this address in Safari, or in your usual browser, first.',
  'more.install.none.generic':
    'Look for “Install”, “Add to Home screen” or “Create shortcut” in the browser menu. If there is none, bookmark this page.',

  'more.install.step.chromium.chrome.secure':
    'Click **Install** at the right end of the address bar, or open the menu **⋮** and choose **Cast, save, and share** → **Install page as app…**',
  'more.install.step.chromium.chrome.insecure':
    'Open the menu **⋮** and choose **Cast, save, and share** → **Install page as app…** (older versions: **Create shortcut…** with **Open as window**)',
  'more.install.step.chromium.edge.secure':
    'Click **App available** in the address bar, or open **Settings and more (…)** → **More tools** → **Apps** → **Install this site as an app**',
  'more.install.step.chromium.edge.insecure':
    'Open **Settings and more (…)** → **More tools** → **Apps** → **Install this site as an app**',
  'more.install.step.chromium.brave.secure':
    'Click **Install** in the address bar, or open the menu → **Save and Share** → **Install…**',
  'more.install.step.chromium.brave.insecure':
    'Open the menu → **Save and Share** → **Install…**. If you only see **Create shortcut…**, choose it and tick **Open as window**',
  'more.install.step.chromium.other.secure':
    'Look for **Install…** in the address bar or in the browser menu',
  'more.install.step.chromium.other.insecure':
    'In the browser menu look for **Install…**, **Install this site as an app** or **Create shortcut…** (with **Open as window**)',
  'more.install.step.chromium.confirm': (p) => `Confirm, then open ${p.name} from the new icon`,
  'more.install.step.android.secure':
    'Open the browser menu **⋮** and tap **Install app** (or **Add to Home screen**)',
  'more.install.step.android.insecure':
    'Open the browser menu **⋮** and tap **Add to Home screen** (or **Create shortcut**)',
  'more.install.step.android.confirm': (p) => `Confirm, then open ${p.name} from the icon`,
  'more.install.step.firefox-android':
    'Open the Firefox menu and choose **Install** or **Add to Home screen**',
  'more.install.step.mac.menu': 'In Safari choose **File** → **Add to Dock…**',
  'more.install.step.mac.confirm': (p) =>
    `Click **Add**, then open ${p.name} from the Dock or Launchpad`,
  'more.install.ios.step1': 'Open the **Share** menu',
  'more.install.ios.step1After': 'of your browser',
  'more.install.ios.step2': 'Choose **Add to Home Screen**',
  'more.install.ios.step3': (p) =>
    `Keep **Open as Web App** on, tap **Add**, then open ${p.name} from its icon`,

  'more.install.note.chromium-desktop.insecure':
    'Menu names change with the browser language and version. From an HTTP address the browser installs the page as an app window.',
  'more.install.note.chromium-desktop.secure':
    'Menu names change with the browser language and version.',
  'more.install.note.chromium-android.insecure':
    'From an HTTP address the shortcut opens in the browser. A real app (own window, offline use, notifications) needs a secure address, see below.',
  'more.install.note.chromium-android.secure':
    'Chrome and Samsung Internet install it as a real app; other browsers add a shortcut.',
  'more.install.note.firefox-android':
    'Firefox adds a shortcut that opens in Firefox, not a separate app.',
  'more.install.note.mac':
    'Needs Safari 17 on macOS Sonoma (14) or later. Command names depend on the language.',
  'more.install.note.ios.insecure':
    'From an HTTP address it opens as an app, but offline use and notifications need a secure address, see below.',
  'more.install.note.ios.secure':
    'On iPhone and iPad notifications only work with the app added to the Home Screen.',

  'more.install.here.title': 'On this address',
  'more.install.cap.installs.title': 'Installs as',
  'more.install.cap.installs.app':
    'A real app: its own window or icon, with offline use and notifications.',
  'more.install.cap.installs.window':
    'An app window. This address is plain HTTP, so there is no offline mode or notifications.',
  'more.install.cap.installs.window-without-worker':
    'An app window for now: the browser refused the service worker (see below), so no offline use or notifications.',
  'more.install.cap.installs.shortcut': 'A shortcut that opens in the browser.',
  'more.install.cap.installs.none': 'Nothing: this browser can’t install web apps.',
  'more.install.cap.offline.title': 'Offline use',
  'more.install.cap.offline.ready':
    'Ready: the app opens without a connection and shows the last data it has.',
  'more.install.cap.offline.preparing': 'Getting ready: reload the page once and check again.',
  'more.install.cap.offline.needs-https': 'Needs a secure (HTTPS) address.',
  'more.install.cap.offline.failed':
    'The browser refused the service worker. Over HTTPS this is usually a certificate this device does not trust: see the HTTPS guide.',
  'more.install.cap.offline.unsupported': 'This browser has no service workers.',
  'more.install.cap.offline.development': 'Off in the development server.',
  'more.install.cap.notifications.title': 'Notifications',
  'more.install.cap.notifications.available':
    'Supported here. Turn them on in the Notifications section.',
  'more.install.cap.notifications.needs-https': 'Needs a secure (HTTPS) address.',
  'more.install.cap.notifications.server-off':
    'Turned off on this server (`push.enabled` in `config.yaml`).',
  'more.install.cap.notifications.install-first':
    'On iPhone and iPad, install the app first, then turn them on from it.',

  'more.install.https.title': 'Want offline use and notifications?',
  'more.install.https.text':
    'Browsers only allow them on a secure address (HTTPS). Plain HTTP, like this one, is fine for everyday use. Pick what fits your setup:',
  'more.install.https.opt.tailscale':
    '**Tailscale**: if your devices already use it, Tailscale Serve can give it a private HTTPS address with one command.',
  'more.install.https.opt.proxy':
    '**A reverse proxy you already run** (Caddy, Nginx Proxy Manager, Traefik…): add it there and use its HTTPS address.',
  'more.install.https.opt.caddy':
    '**Caddy with a domain name of yours**: it gets and renews free certificates by itself.',
  'more.install.https.opt.local-ca':
    '**Home network only**: a local certificate authority (Caddy’s internal CA, mkcert). Each device has to trust it once.',
  'more.install.https.opt.localhost':
    '**Only on this computer**: open it as `localhost` (for example through an SSH tunnel to the server). Browsers treat that as secure.',
  'more.install.https.guide': 'Step-by-step HTTPS guide',
  'more.install.https.secureUrl.title': 'Your secure address',
  'more.install.https.secureUrl.text': (p) =>
    `Open ${p.name} from this address to install it as a full app.`,
  'more.install.https.secureUrl.hint':
    'Already have one? Set `publicUrl` in `config.yaml` and it shows up here.',
  'more.install.https.recommended': 'Recommended: install from the secure address',
  'more.install.https.orHere': 'Or install from this address',

  'more.secure.open': 'Open',
  'more.secure.copy': 'Copy',
  'more.secure.copied': 'Address copied',
  'more.secure.copyFailed': 'Couldn’t copy: select the address by hand',

  'more.notifications.title': 'Notifications',
  'more.notifications.heading': 'Push notifications',
  'more.notifications.checking': 'Checking notifications',
  'more.notifications.error.title': 'Status unavailable',
  'more.notifications.error.text': (p) => `Can’t read the notification status from ${p.name}.`,
  'more.notifications.inactive.title': 'Notifications are off',
  'more.notifications.inactive.text': 'Turn them on to get alerted on this device.',
  'more.notifications.active.title': 'Notifications are on',
  'more.notifications.active.text': 'This device will receive critical alerts.',
  'more.notifications.insecure.title': 'Needs a secure address',
  'more.notifications.insecure.text': (p) =>
    `Notifications only work on a secure (HTTPS) address, and ${p.name} is open over plain HTTP here. The Installation section above explains how to get one.`,
  'more.notifications.needsInstall.title': 'Install the app first',
  'more.notifications.needsInstall.text': (p) =>
    `On iPhone and iPad notifications only work with ${p.name} installed: add it to your Home Screen and open it from there.`,
  'more.notifications.unsupported.title': 'Notifications not supported',
  'more.notifications.unsupported.text': 'This browser doesn’t support push notifications.',
  'more.notifications.limited.title': 'Full access required',
  'more.notifications.limited.text':
    'Notifications are only available with full access; they are turned off with limited access.',
  'more.notifications.unavailable.title': 'Notifications not configured',
  'more.notifications.unavailable.text':
    'The server doesn’t have the keys needed to send notifications.',
  'more.notifications.denied.title': 'Permission denied',
  'more.notifications.denied.text': (p) =>
    `You blocked notifications for ${p.name}. Re-enable them in the browser or device settings (on iPhone: Settings › Notifications › ${p.name}), then come back here.`,
  'more.notifications.enable': 'Turn on notifications',
  'more.notifications.test': 'Send a test notification',
  'more.notifications.disable': 'Turn off',
  'more.notifications.retry': 'Retry',
  'more.notifications.enabled': 'Notifications turned on for this device',
  'more.notifications.disabled': 'Notifications turned off for this device',
  'more.notifications.sent': (p) =>
    p.n === 1 ? 'Notification sent to 1 device' : `Notification sent to ${p.n} devices`,
  'more.notifications.sentNone': 'The notification reached no device',
  'more.notifications.note':
    'You only get notified for critical alerts, such as a failing disk or an essential service going offline.',
  'more.notifications.devices': (p) =>
    p.n === 0
      ? 'No devices registered'
      : p.n === 1
        ? '1 device registered'
        : `${p.n} devices registered`,

  'more.pushError.noServiceWorker':
    'The service worker isn’t active: open the app from the HTTPS address and try again.',
  'more.pushError.permissionDenied': (p) =>
    `Permission denied: allow notifications for ${p.name} in the settings.`,
  'more.pushError.permissionDismissed':
    'Permission not granted: tap “Turn on” again and allow notifications.',
  'more.pushError.incompleteSubscription': 'The browser returned an incomplete subscription.',
  'more.pushError.notConfigured': 'The server doesn’t have notifications configured.',
  'more.pushError.unreachable': (p) => `${p.name} is unreachable. Try again shortly.`,
  'more.pushError.forbidden': 'Not allowed: notifications require full access.',
  'more.pushError.tooManyDevices': 'Too many registered devices: remove one before adding another.',
  'more.pushError.rejected': 'The server rejected this device’s subscription.',
  'more.pushError.server': (p) => `The server answered with an error (${p.status ?? 'unknown'}).`,
  'more.pushError.browserDenied': 'Permission for notifications was denied.',
  'more.pushError.pushService': 'The browser’s push service is unreachable. Try again shortly.',
  'more.pushError.generic': 'Couldn’t complete the operation. Try again.',

  'more.links.title': 'Quick links',

  'more.extensions.title': 'Extensions',

  'more.about.title': 'About',
  'more.about.listLabel': (p) => `About ${p.name}`,
  'more.about.appVersion': 'App version',
  'more.about.appVersionUnavailable': 'unavailable',
  'more.about.appVersionDevelopment': 'development',
  'more.about.serverVersion': 'Server version',
  'more.about.access': 'Access',
  'more.about.accessFull': 'Full access',
  'more.about.accessLimited': 'Limited access',
  'more.about.accessLimitedHint': 'Some data and notifications are unavailable',
  'more.about.mode.limited': 'Limited mode',
  'more.about.mode.trusted-network': 'Trusted network',
  'more.about.mode.identity-proxy': 'Identity proxy',
  'more.about.diagnostics': 'Diagnostics',
  'more.about.diagnosticsHint': 'Data sources, server and this device',
  'more.about.actions': 'Actions',
  'more.about.refreshAll': 'Refresh all data',
  'more.about.refreshing': 'Refreshing…',
  'more.about.refreshed': 'Data refreshed',
  'more.about.reload': 'Reload app',
  'more.about.reloadHint': 'A new version is ready to install',
  'more.notFound.title': 'Page not found',
  'more.notFound.heading': 'This page does not exist',
  'more.notFound.description': (p) =>
    `This address does not match any screen of ${p.name}. If it is an optional page, it may be turned off on this installation.`,
  'more.notFound.home': 'Back to Home',
};
