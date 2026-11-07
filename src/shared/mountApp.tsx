import { StrictMode, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { localStoreCache, preloadLocalValues } from './storage';
import { initTelemetry } from './telemetry';
import { applyTheme, prefersDarkScheme, resolveTheme } from './theme';

// 保存済み設定の hydrate を待たずに描画すると、既定テーマ/モードで一度描いてから
// 作り直すことになり、ライトテーマの利用者にダークの閃光が見える。
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
