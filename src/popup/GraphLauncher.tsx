import { useEffect, useState } from 'react';
import { parseRepoFromInput, parseRepoFromUrl, type RepoRef } from '@/graph/lib/parseUrl';
import { openGraphTab } from '@/shared/openGraphTab';
import { t, tWith } from '@/shared/i18n';

export function GraphLauncher() {
  const [detected, setDetected] = useState<RepoRef | null>(null);
  const [manual, setManual] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    chrome.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => {
        if (cancelled) return;
        setDetected(parseRepoFromUrl(tabs[0]?.url ?? null));
      })
      .catch(() => {
        if (cancelled) return;
        setDetected(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {t('popup_launcher_title')}
      </p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        {t('popup_launcher_description')}
      </p>

      {detected ? (
        <button
          type="button"
          onClick={() => void openGraphTab(detected.owner, detected.repo)}
          className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500 active:scale-[0.99]"
        >
          {tWith('popup_launcher_open_detected', { repo: `${detected.owner}/${detected.repo}` })}
        </button>
      ) : (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          {t('popup_launcher_not_on_github')}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = parseRepoFromInput(manual);
          if (!parsed) {
            setError(t('popup_launcher_input_error'));
            return;
          }
          setError(null);
          void openGraphTab(parsed.owner, parsed.repo);
        }}
        className="mt-3 flex flex-col gap-2"
      >
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder={t('popup_launcher_input_placeholder')}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        {error ? <p className="text-[10px] text-rose-500">{error}</p> : null}
        <button
          type="submit"
          className="rounded-md bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
        >
          {t('popup_launcher_submit')}
        </button>
      </form>
    </section>
  );
}
