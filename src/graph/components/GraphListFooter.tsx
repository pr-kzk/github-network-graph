import { t, tWith } from '@/shared/i18n';
import { ROW_HEIGHT } from '../lib/graphMetrics';

type GraphListFooterProps = {
  loadingMore: boolean;
  olderError: { message: string } | null;
  onRetry: () => void;
  graphAreaWidth: number;
};

export function GraphListFooter({
  loadingMore,
  olderError,
  onRetry,
  graphAreaWidth,
}: GraphListFooterProps) {
  return (
    <div
      className="flex w-full items-center border-b border-slate-200 text-xs text-slate-600 dark:border-slate-900/40 dark:text-slate-400"
      style={{ height: ROW_HEIGHT }}
    >
      <div style={{ width: graphAreaWidth }} className="shrink-0" aria-hidden="true" />
      {olderError ? (
        <div className="flex items-center gap-2 pr-3">
          <span className="text-rose-400">
            {tWith('graph_footer_load_error', { message: olderError.message })}
          </span>
          <button
            type="button"
            onClick={onRetry}
            className="rounded bg-slate-200 px-2 py-0.5 text-[11px] text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {t('graph_footer_retry')}
          </button>
        </div>
      ) : loadingMore ? (
        <span className="pr-3">{t('graph_footer_loading_more')}</span>
      ) : (
        <span className="pr-3 text-slate-500">{t('graph_footer_will_load_more')}</span>
      )}
    </div>
  );
}
