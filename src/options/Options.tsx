import { useEffect, useRef, useState } from 'react';
import { t } from '@/shared/i18n';
import { type GraphMode, localStore } from '@/shared/storage';
import { useLocalValue } from '@/shared/useLocalValue';

const MODE_OPTIONS: ReadonlyArray<{
  value: GraphMode;
  label: string;
  description: string;
}> = [
  {
    value: 'network',
    label: t('options_mode_network_label'),
    description: t('options_mode_network_desc'),
  },
  {
    value: 'repo-only',
    label: t('options_mode_repo_only_label'),
    description: t('options_mode_repo_only_desc'),
  },
];

export function Options() {
  const prefs = useLocalValue('graphPrefs');
  const mode = prefs.mode;
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current !== null) {
        window.clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  const handleChange = async (next: GraphMode) => {
    await localStore.set('graphPrefs', { mode: next });
    setSaved(true);
    if (savedTimerRef.current !== null) {
      window.clearTimeout(savedTimerRef.current);
    }
    savedTimerRef.current = window.setTimeout(() => {
      setSaved(false);
      savedTimerRef.current = null;
    }, 1500);
  };

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8 text-slate-900 dark:text-slate-100">
      <header className="flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">{t('options_title')}</h1>
        {saved && <span className="text-sm text-emerald-600">{t('options_saved')}</span>}
      </header>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold">{t('options_mode_heading')}</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {t('options_mode_description')}
          </p>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">{t('options_mode_legend')}</legend>
          {MODE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={[
                'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition',
                mode === opt.value
                  ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/40'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600',
              ].join(' ')}
            >
              <input
                type="radio"
                name="graph-mode"
                value={opt.value}
                checked={mode === opt.value}
                onChange={() => handleChange(opt.value)}
                className="mt-0.5 h-4 w-4 accent-indigo-600"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{opt.label}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {opt.description}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      </section>
    </main>
  );
}
