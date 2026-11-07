import { t, tWith } from '@/shared/i18n';
import { Spinner } from './Spinner';
import { BUTTON_SECONDARY, FOCUS_RING } from '@/shared/ui';

type SeekBannerProps = {
  target: string;
  scanned: number;
  total: number;
  onCancel: () => void;
};

export function SeekBanner({ target, scanned, total, onCancel }: SeekBannerProps) {
  const count = scanned.toLocaleString();
  const progress =
    total > 0
      ? tWith('graph_seek_progress_total', { count, total: total.toLocaleString() })
      : tWith('graph_seek_progress', { count });
  const percent = total > 0 ? Math.min(100, (scanned / total) * 100) : 0;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-9 z-20 flex justify-center px-3">
      <output
        aria-live="polite"
        className="pointer-events-auto flex w-full max-w-xl flex-col gap-2 rounded-lg border border-indigo-300 bg-white/95 px-4 py-3 text-slate-800 shadow-lg backdrop-blur dark:border-indigo-500/50 dark:bg-slate-900/95 dark:text-slate-100"
      >
        <span className="flex items-center gap-3">
          <Spinner className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {tWith('graph_seek_title', { target })}
            </span>
            <span className="block text-xs text-slate-600 tabular-nums dark:text-slate-400">
              {progress}
            </span>
          </span>
          <button
            type="button"
            onClick={onCancel}
            className={`shrink-0 px-3 py-1 text-xs font-medium ${BUTTON_SECONDARY} ${FOCUS_RING}`}
          >
            {t('graph_status_seek_cancel')}
          </button>
        </span>
        <span
          aria-hidden="true"
          className="block h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
        >
          <span
            className={`block h-full rounded-full bg-indigo-500 transition-[width] duration-300 dark:bg-indigo-400 ${total > 0 ? '' : 'w-full motion-safe:animate-pulse'}`}
            style={total > 0 ? { width: `${percent}%` } : undefined}
          />
        </span>
      </output>
    </div>
  );
}
