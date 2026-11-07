import { StrictMode, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { localStoreCache, preloadLocalValues } from './storage';
import { initTelemetry } from './telemetry';
import { applyTheme, prefersDarkScheme, resolveTheme } from './theme';

// Rendering before saved settings hydrate would draw once with the default theme and mode, and
// light-theme users would see a dark flash.
export async function mountApp(app: ReactElement): Promise<void> {
  const container = document.getElementById('root');
  if (!container) throw new Error('root element not found');

  void initTelemetry();
  document.documentElement.lang = chrome.i18n.getUILanguage();

  await preloadLocalValues(['graphPrefs']).catch(() => undefined);
  const { theme } = localStoreCache.getSnapshot('graphPrefs');
  applyTheme(resolveTheme(theme, prefersDarkScheme()));

  createRoot(container).render(<StrictMode>{app}</StrictMode>);
}
