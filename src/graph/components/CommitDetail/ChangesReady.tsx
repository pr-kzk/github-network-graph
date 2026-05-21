import type { CommitDetailFile } from '../../lib/commitDetailApi';
import { t } from '@/shared/i18n';
import { FileStatusBadge } from './FileStatusBadge';

export type ChangesReadyProps = {
  data: {
    additions: number;
    deletions: number;
    total: number;
    files: CommitDetailFile[];
    truncated: boolean;
  };
};

export function ChangesReady({ data }: ChangesReadyProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-slate-600 dark:text-slate-400">
          <span className="text-slate-900 dark:text-slate-200">{data.files.length}</span>
          {data.truncated
            ? t('commit_detail_changes_files_truncated')
            : ' ' + t('commit_detail_changes_files_singular')}
        </span>
        <span className="text-emerald-600 dark:text-emerald-400">+{data.additions}</span>
        <span className="text-rose-600 dark:text-rose-400">−{data.deletions}</span>
      </div>
      {data.files.length === 0 ? (
        <p className="text-xs text-slate-500">{t('commit_detail_changes_no_files')}</p>
      ) : (
        <ul className="space-y-0.5 text-xs">
          {data.files.map((f) => (
            <li
              key={f.filename}
              className="flex items-center gap-2 rounded px-1 hover:bg-slate-100 dark:hover:bg-slate-900/40"
              title={
                f.previousFilename
                  ? `${f.previousFilename} → ${f.filename}`
                  : f.filename
              }
            >
              <FileStatusBadge status={f.status} />
              <span className="min-w-0 flex-1 truncate font-mono text-slate-700 dark:text-slate-300">
                {f.filename}
              </span>
              <span className="shrink-0 font-mono text-[10px] tabular-nums">
                <span className="text-emerald-600 dark:text-emerald-400">+{f.additions}</span>
                <span className="px-0.5 text-slate-400 dark:text-slate-600">/</span>
                <span className="text-rose-600 dark:text-rose-400">−{f.deletions}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {data.truncated ? (
        <p className="text-[11px] text-slate-500">
          {t('commit_detail_changes_truncated_note')}
        </p>
      ) : null}
    </div>
  );
}
