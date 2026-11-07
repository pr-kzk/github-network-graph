import { useState } from 'react';
import { t } from '@/shared/i18n';
import { type GraphMode, type Theme, localStore } from '@/shared/storage';
import { isTelemetryConfigured, setTelemetryEnabled } from '@/shared/telemetry';
import { useLocalValue } from '@/shared/useLocalValue';
import { useRestartableTimeout } from '@/shared/useRestartableTimeout';
import { useTheme } from '@/shared/useTheme';
import { RadioSection, type RadioOption } from './RadioSection';

const PRIVACY_URL = 'https://github.com/pr-kzk/github-network-graph/blob/main/PRIVACY.md';

const SAVED_NOTICE_MS = 1500;

const MODE_OPTIONS: ReadonlyArray<RadioOption<GraphMode>> = [
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

const THEME_OPTIONS: ReadonlyArray<RadioOption<Theme>> = [
  {
    value: 'system',
    label: t('options_theme_system_label'),
    description: t('options_theme_system_desc'),
  },
  {
    value: 'dark',
    label: t('options_theme_dark_label'),
    description: t('options_theme_dark_desc'),
  },
  {
    value: 'light',
    label: t('options_theme_light_label'),
    description: t('options_theme_light_desc'),
  },
];

export function Options() {
  useTheme();
  const prefs = useLocalValue('graphPrefs');
  const telemetry = useLocalValue('telemetry');
  const [saved, setSaved] = useState(false);
  const restartTimeout = useRestartableTimeout();

  const markSaved = () => {
    setSaved(true);
    restartTimeout(() => setSaved(false), SAVED_NOTICE_MS);
  };

  const savePrefs = async (patch: Partial<typeof prefs>) => {
    await localStore.update('graphPrefs', patch);
    markSaved();
  };

  const handleTelemetryChange = async (next: boolean) => {
    await setTelemetryEnabled(next);
    markSaved();
  };

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 bg-white p-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">{t('options_title')}</h1>
        {saved && <span className="text-sm text-emerald-600">{t('options_saved')}</span>}
      </header>

      <RadioSection
        name="graph-mode"
        heading={t('options_mode_heading')}
        description={t('options_mode_description')}
        legend={t('options_mode_legend')}
        options={MODE_OPTIONS}
        value={prefs.mode}
        onChange={(mode) => savePrefs({ mode })}
      />

      <RadioSection
        name="graph-theme"
        heading={t('options_theme_heading')}
        description={t('options_theme_description')}
        legend={t('options_theme_legend')}
        options={THEME_OPTIONS}
        value={prefs.theme}
        onChange={(theme) => savePrefs({ theme })}
      />

      {isTelemetryConfigured() && (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-semibold">{t('options_telemetry_heading')}</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t('options_telemetry_description')}{' '}
              <a
                href={PRIVACY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {t('options_telemetry_learn_more')}
              </a>
            </p>
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 transition hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600">
            <input
              type="checkbox"
              checked={telemetry.enabled}
              onChange={(e) => handleTelemetryChange(e.target.checked)}
              className="h-4 w-4 accent-indigo-600"
            />
            <span className="text-sm font-medium">{t('options_telemetry_toggle_label')}</span>
          </label>
        </section>
      )}

      <footer className="border-t border-slate-200 pt-4 dark:border-slate-800">
        <a
          href="https://github.com/pr-kzk/github-network-graph"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:underline dark:text-indigo-400"
        >
          <svg viewBox="0 0 16 16" aria-hidden className="h-4 w-4 fill-current">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
          {t('options_view_source')}
        </a>
      </footer>
    </main>
  );
}
