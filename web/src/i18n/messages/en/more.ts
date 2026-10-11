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
  'more.install.insecure.title': 'HTTPS address required',
  'more.install.insecure.text': (p) =>
    `Full installation, offline use and notifications need the HTTPS address. From this address ${p.name} only works as a website.`,
  'more.install.noSecureUrl':
    'The HTTPS address is not configured on the server yet (`publicUrl` in `config.yaml`).',
  'more.install.prompt.title': (p) => `Install ${p.name}`,
  'more.install.prompt.text': 'Add it to your Home Screen to open it full screen, like an app.',
  'more.install.prompt.button': 'Install',
  'more.install.ios.title': 'Add to Home Screen',
  'more.install.ios.text': (p) => `From Safari, so ${p.name} opens like an app.`,
  'more.install.ios.step1': 'Tap **Share**',
  'more.install.ios.step1After': 'in the Safari toolbar',
  'more.install.ios.step2': 'Choose **Add to Home Screen**',
  'more.install.ios.step3': (p) => `Tap **Add**, then open ${p.name} from its icon`,
  'more.install.browser.title': 'Install from the browser',
  'more.install.browser.text':
    'Look for “Install app” or “Add to Home Screen” in the browser menu. Not every browser supports it.',

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
  'more.notifications.insecure.title': 'HTTPS address required',
  'more.notifications.insecure.text': (p) =>
    `Notifications only work from the HTTPS address of ${p.name}, shown in the Installation section.`,
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
