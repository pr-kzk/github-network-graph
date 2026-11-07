import type { ViewCommit } from '../lib/transform.types';
import { formatFullDate } from '@/shared/format';
import { t } from '@/shared/i18n';
import { flipAroundPointer, useAnchoredPosition } from '../hooks/useAnchoredPosition';
import { AuthorAvatar } from './AuthorAvatar';
import { RefBadge } from './RefBadge';

type CommitTooltipProps = {
  commit: ViewCommit;
  x: number;
  y: number;
};

export function CommitTooltip({ commit, x, y }: CommitTooltipProps) {
  const { ref, position } = useAnchoredPosition<HTMLDivElement>(x, y, flipAroundPointer);

  const date = formatFullDate(commit.dateLabel);

  return (
    <div
      ref={ref}
      role="tooltip"
      className="pointer-events-none fixed z-50 max-w-[380px] rounded-md border border-slate-300 bg-white/95 px-3 py-2 text-xs text-slate-900 shadow-xl ring-1 ring-black/10 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100 dark:ring-black/40"
      style={{ left: position.left, top: position.top }}
    >
      <div className="mb-1 line-clamp-2 text-[13px] font-medium leading-snug text-slate-950 dark:text-slate-50">
        {commit.subject || <span className="text-slate-500">{t('commit_detail_no_message')}</span>}
      </div>
      {commit.refs.length > 0 ? (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {commit.refs.map((r) => (
            <RefBadge key={`${r.ownerName}:${r.name}`} refItem={r} />
          ))}
        </div>
      ) : null}
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-[11px]">
        <dt className="text-slate-500">{t('graph_tooltip_commit')}</dt>
        <dd className="font-mono text-slate-800 dark:text-slate-200">{commit.shortSha}</dd>
        <dt className="text-slate-500">{t('graph_column_author')}</dt>
        <dd className="flex min-w-0 items-center gap-1.5 text-slate-800 dark:text-slate-200">
          <AuthorAvatar login={commit.authorLogin} alt={commit.authorName} size={14} />
          <span className="truncate">
            {commit.authorName || t('commit_unknown_author')}
            {commit.authorRepo && commit.authorName !== commit.authorRepo ? (
              <span className="text-slate-500"> / {commit.authorRepo}</span>
            ) : null}
          </span>
        </dd>
        {date ? (
          <>
            <dt className="text-slate-500">{t('graph_column_date')}</dt>
            <dd className="font-mono text-slate-800 dark:text-slate-200">{date}</dd>
          </>
        ) : null}
        {commit.parents.length > 0 ? (
          <>
            <dt className="text-slate-500">{t('graph_tooltip_parents')}</dt>
            <dd className="truncate font-mono text-slate-800 dark:text-slate-200">
              {commit.parents.map((p) => p.slice(0, 7)).join(', ')}
            </dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}
