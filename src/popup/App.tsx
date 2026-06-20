import { GraphLauncher } from './GraphLauncher';
import { RecentRepos } from './RecentRepos';
import { t } from '@/shared/i18n';
import {
  declineTelemetry,
  isTelemetryConfigured,
  markTelemetryPromptSeen,
} from '@/shared/telemetry';
import { useLocalValue } from '@/shared/useLocalValue';
import { useTheme } from '@/shared/useTheme';

export function App() {
  useTheme();
  const telemetry = useLocalValue('telemetry');
  const showConsentBanner = isTelemetryConfigured() && !telemetry.promptSeen;

  return (
    <main className="flex min-w-[320px] flex-col gap-4 bg-white p-6 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <header className="flex items-center gap-3">
        <img src="/icons/icon-48.png" alt="" className="h-10 w-10 rounded-xl" />
        <div>
          <h1 className="text-lg font-semibold">{t('popup_header_title')}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('popup_header_subtitle')}</p>
        </div>
      </header>

      {showConsentBanner && (
        <section className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-900 dark:bg-indigo-950/40">
          <p className="text-xs text-slate-700 dark:text-slate-200">
            {t('popup_telemetry_banner_text')}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => void markTelemetryPromptSeen(telemetry)}
              className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-500"
            >
              {t('popup_telemetry_banner_dismiss')}
            </button>
            <button
              type="button"
              onClick={() => void declineTelemetry(telemetry)}
              className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t('popup_telemetry_banner_opt_out')}
            </button>
          </div>
        </section>
      )}

      <GraphLauncher />
      <RecentRepos />

      <button
        type="button"
        onClick={() => chrome.runtime.openOptionsPage()}
        className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
      >
        {t('popup_open_options')}
      </button>
    </main>
  );
}
