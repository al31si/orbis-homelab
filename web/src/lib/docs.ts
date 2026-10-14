import type { HttpsOption } from '@/pwa/installGuide';

/** Where the project documentation lives; the app only links to it, it never loads it. */
const DOCS = 'https://github.com/al31si/orbis-homelab/blob/main/docs';

/** Step-by-step guide to a secure (HTTPS) address for a self-hosted install. */
export const HTTPS_GUIDE_URL = `${DOCS}/https.md`;

/** Troubleshooting entry for notifications that cannot be turned on or do not arrive. */
export const PUSH_HELP_URL = `${DOCS}/troubleshooting.md#the-browser-push-service-is-unreachable`;

/** The section of the guide for each way to a secure address (anchors of `docs/https.md`). */
export const HTTPS_OPTION_URL: Record<HttpsOption, string> = {
  tailscale: `${HTTPS_GUIDE_URL}#option-1-tailscale-serve`,
  proxy: `${HTTPS_GUIDE_URL}#option-2-a-reverse-proxy-you-already-run`,
  caddy: `${HTTPS_GUIDE_URL}#option-3-caddy-with-a-domain-name`,
  'local-ca': `${HTTPS_GUIDE_URL}#option-4-a-local-certificate-authority-home-network-only`,
  localhost: `${HTTPS_GUIDE_URL}#option-5-localhost-on-one-computer`,
};
