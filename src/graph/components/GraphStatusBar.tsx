import { t, tWith } from '@/shared/i18n';
import { useStatusMessage } from '../hooks/useRetryMessage';
import type { RetryNotice } from '../lib/networkApi.types';

type GraphStatusBarProps = {
  loadedCount: number;
  hasMore: boolean;
  refreshing: boolean;
  pendingNotice: boolean;
  retry: RetryNotice | null;
};

export function GraphStatusBar({
  loadedCount,
  hasMore,
  refreshing,
  pendingNotice,
  retry,
}: GraphStatusBarProps) {
  const status = useStatusMessage(retry, pendingNotice, t('graph_status_refreshing'));
  const summary =
    loadedCount === 1
      ? t('graph_status_commits_one')
      : tWith('graph_status_commits_many', { count: loadedCount.toLocaleString() });
  return (
    <output className="flex items-center gap-3 shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-1.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
      <span>
        {summary}
        {' · '}
        {hasMore ? t('graph_status_more_available') : t('graph_status_complete')}
      </span>
      {refreshing || status.retrying ? (
        <span className="flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-indigo-700 dark:text-indigo-300">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full motion-safe:animate-pulse bg-indigo-500 dark:bg-indigo-400"
          />
          {status.text}
        </span>
      ) : null}
    </output>
  );
}
