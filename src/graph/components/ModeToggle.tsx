import { useEffect, useId, useState } from 'react';
import { t, type MessageKey } from '@/shared/i18n';
import type { GraphMode } from '@/shared/storage';

type ModeToggleProps = {
  mode: GraphMode;
  onChange: (next: GraphMode) => void;
};

const OPTIONS: ReadonlyArray<{
  value: GraphMode;
  label: MessageKey;
  hint: MessageKey;
}> = [
  { value: 'repo-only', label: 'graph_mode_repo_only', hint: 'graph_mode_repo_only_hint' },
  { value: 'network', label: 'graph_mode_network', hint: 'graph_mode_network_hint' },
];

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const helpId = useId();

  useEffect(() => {
    if (!helpOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setHelpOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [helpOpen]);

  return (
    <div className="relative flex items-center gap-1.5">
      <fieldset
        aria-label={t('graph_mode_group_label')}
        className="m-0 flex min-w-0 items-center gap-1 rounded-md border-0 bg-slate-100 p-0.5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
      >
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={mode === option.value}
            title={t(option.hint)}
            onClick={() => onChange(option.value)}
            className={[
              'rounded px-2.5 py-1 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500',
              mode === option.value
                ? 'bg-indigo-600 text-white'
                : 'text-slate-700 dark:text-slate-300',
            ].join(' ')}
          >
            {t(option.label)}
          </button>
        ))}
      </fieldset>
      <button
        type="button"
        aria-label={t('graph_mode_help_label')}
        aria-expanded={helpOpen}
        aria-controls={helpId}
        onClick={() => setHelpOpen((open) => !open)}
        className="flex size-5 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        ?
      </button>
      <div
        id={helpId}
        hidden={!helpOpen}
        className="absolute right-0 top-full z-40 mt-2 w-72 space-y-2 rounded-md border border-slate-300 bg-white p-3 text-xs text-slate-700 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      >
        {OPTIONS.map((option) => (
          <p key={option.value}>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {t(option.label)}
            </span>
            {' — '}
            {t(option.hint)}
          </p>
        ))}
      </div>
    </div>
  );
}
