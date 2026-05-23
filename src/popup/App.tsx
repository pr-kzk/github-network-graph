import { GraphLauncher } from './GraphLauncher';
import { RecentRepos } from './RecentRepos';
import { t } from '@/shared/i18n';
import { useTheme } from '@/shared/useTheme';

export function App() {
  useTheme();
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
