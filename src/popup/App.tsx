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

      <GraphLauncher />
      <RecentRepos />

      {showConsentBanner && (
        <section
          aria-label={t('popup_telemetry_banner_label')}
          className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40"
        >
          <p className="text-[11px] text-slate-600 dark:text-slate-300">
            {t('popup_telemetry_banner_text')}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => void markTelemetryPromptSeen()}
              className="rounded-md bg-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
            >
              {t('popup_telemetry_banner_dismiss')}
            </button>
            <button
              type="button"
              onClick={() => void declineTelemetry()}
              className="rounded-md px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {t('popup_telemetry_banner_opt_out')}
            </button>
          </div>
        </section>
      )}

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
