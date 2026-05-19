import { useState } from 'react';
import { openGraphTab } from '@/shared/openGraphTab';
import { formatRelativeFromMs } from '@/shared/format';
import { useLocalValue } from '@/shared/useLocalValue';
import { t } from '@/shared/i18n';

export function RecentRepos() {
  const items = useLocalValue('recentRepos');
  // popup を開いた時点の時刻を「相対表示の基準点」として固定する。
  // render 中に Date.now() を呼ぶと react-hooks/purity に引っかかるため lazy init で 1 度だけ取得。
  const [now] = useState(() => Date.now());

  if (items.length === 0) return null;

  return (
    <section
      aria-label={t('popup_recent_aria_label')}
      className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
    >
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {t('popup_recent_title')}
      </p>
      <ul className="mt-2 flex flex-col gap-1">
        {items.map((entry) => (
          <li key={`${entry.owner}/${entry.repo}`}>
            <button
              type="button"
              onClick={() => void openGraphTab(entry.owner, entry.repo)}
              className="group flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span className="truncate font-mono text-xs text-slate-700 group-hover:text-indigo-600 dark:text-slate-200 dark:group-hover:text-indigo-300">
                {entry.owner}/{entry.repo}
              </span>
              <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500">
                {formatRelativeFromMs(entry.openedAt, { now, style: 'long' })}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
