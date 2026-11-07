import { t } from '@/shared/i18n';
import { useRetryMessage } from '../hooks/useRetryMessage';
import { ROW_HEIGHT } from '../lib/graphMetrics';
import type { RetryNotice } from '../lib/networkApi.types';

const SKELETON_ROWS = 14;

type GraphSkeletonProps = {
  pendingNotice: boolean;
  retry: RetryNotice | null;
};

function Bar({ className }: { className: string }) {
  return <span className={`block h-2.5 rounded bg-slate-200 dark:bg-slate-800 ${className}`} />;
}

export function GraphSkeleton({ pendingNotice, retry }: GraphSkeletonProps) {
  const retryMessage = useRetryMessage(retry);
  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-busy="true">
      <output className="block px-4 py-2 text-xs text-slate-600 dark:text-slate-400">
        {retryMessage ?? (pendingNotice ? t('graph_status_pending') : t('graph_loading'))}
      </output>
      <div aria-hidden="true" className="overflow-hidden motion-safe:animate-pulse">
        {Array.from({ length: SKELETON_ROWS }, (_, i) => (
          <div
            key={i}
            className="flex items-center border-b border-slate-200 dark:border-slate-900/40"
            style={{ height: ROW_HEIGHT }}
          >
            <span className="flex w-16 shrink-0 justify-center">
              <span className="block h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-700" />
            </span>
            <span className="w-32 shrink-0 pr-3">
              <Bar className="w-20" />
            </span>
            <span className="min-w-0 flex-1 pr-3">
              <Bar className={i % 3 === 0 ? 'w-2/3' : i % 3 === 1 ? 'w-1/2' : 'w-3/4'} />
            </span>
            <span className="w-16 shrink-0 pr-3">
              <Bar className="w-10" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
