import { useState } from 'react';
import { openGraphTab } from '@/shared/openGraphTab';
import { formatRelativeFromMs } from '@/shared/format';
import { useLocalValue } from '@/shared/useLocalValue';
import { clearRecentRepos, removeRecentRepo } from '@/shared/storage';
import { t, tWith } from '@/shared/i18n';
import { FOCUS_RING_FLUSH } from '@/shared/ui';

export function RecentRepos() {
  const items = useLocalValue('recentRepos');
  const [now] = useState(() => Date.now());

  if (items.length === 0) return null;

  return (
    <section
      aria-label={t('popup_recent_aria_label')}
      className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {t('popup_recent_title')}
        </p>
        <button
          type="button"
          onClick={() => void clearRecentRepos()}
          className={`rounded px-1.5 py-0.5 text-[11px] text-slate-500 hover:bg-slate-100 hover:text-rose-600 ${FOCUS_RING_FLUSH} dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-rose-400`}
        >
          {t('popup_recent_clear')}
        </button>
      </div>
      <ul className="mt-2 flex flex-col gap-0.5">
        {items.map((entry) => {
          const name = `${entry.owner}/${entry.repo}`;
          return (
            <li
              key={name}
              className="flex items-center gap-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <button
                type="button"
                onClick={() => void openGraphTab(entry.owner, entry.repo, 'recent')}
                className={`group flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left ${FOCUS_RING_FLUSH}`}
              >
                <span className="truncate font-mono text-xs text-slate-700 group-hover:text-indigo-600 dark:text-slate-200 dark:group-hover:text-indigo-300">
                  {name}
                </span>
                <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500">
                  {formatRelativeFromMs(entry.openedAt, { now, style: 'long' })}
                </span>
              </button>
              <button
                type="button"
                aria-label={tWith('popup_recent_remove', { repo: name })}
                title={tWith('popup_recent_remove', { repo: name })}
                onClick={() => void removeRecentRepo(entry.owner, entry.repo)}
                className={`mr-1 shrink-0 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-rose-600 ${FOCUS_RING_FLUSH} dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-rose-400`}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 12 12"
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
                  <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
                </svg>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
