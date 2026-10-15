import { StrictMode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { BootFailure } from '@/boot/BootFailure';
import { BootProvider, loadBootConfig } from '@/boot';
import { exposeHostGlobals, loadExtensions } from '@/extensions';
import { setLanguage } from '@/i18n';
import { applyAccent } from '@/lib/accent';
import { initPrefs } from '@/lib/prefs';
import { initTheme } from '@/lib/theme';
import { initInstall } from '@/pwa/useInstall';
import { registerServiceWorker } from '@/pwa/register';
import { ErrorBoundary } from '@/ui/ErrorBoundary';
import App from './App';
import '@fontsource-variable/instrument-sans/wdth.css';
import './styles/tokens.css';
import './styles/base.css';

async function start(): Promise<void> {
  const container = document.getElementById('root');
  if (!container) throw new Error('#root not found');
  const root = createRoot(container);

  let boot;
  try {
    boot = await loadBootConfig();
  } catch (error) {
    console.error('Boot failed', error);
    setLanguage(navigator.language.toLowerCase().startsWith('it') ? 'it' : 'en');
    root.render(<BootFailure />);
    return;
  }

  const { app } = boot;
  setLanguage(app.language);
  document.title = app.name;
  applyAccent(app.accent);
  initPrefs(app);
  initTheme();
  registerServiceWorker();
  initInstall(app.id);
  exposeHostGlobals();

  flushSync(() => {
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <BootProvider config={boot}>
            <App />
          </BootProvider>
        </ErrorBoundary>
      </StrictMode>,
    );
  });
  loadExtensions(boot.extensions);
}

void start();
