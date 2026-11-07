import type { ViewCommit } from '../lib/transform.types';
import { formatFullDate } from '@/shared/format';
import { t } from '@/shared/i18n';
import { PANEL_SURFACE_TRANSLUCENT } from '@/shared/ui';
import { useSyncExternalStore } from 'react';
import { flipAroundPointer, useAnchoredPosition } from '../hooks/useAnchoredPosition';
import type { TooltipPointer } from '../hooks/useCommitTooltip';
import { shortSha } from '../lib/shortSha';
import { AuthorAvatar } from './AuthorAvatar';
import { AuthorLabel } from './AuthorLabel';
import { RefBadge } from './RefBadge';

type CommitTooltipProps = {
  commit: ViewCommit;
  pointer: TooltipPointer;
};

export function CommitTooltip({ commit, pointer }: CommitTooltipProps) {
  const { x, y } = useSyncExternalStore(pointer.subscribe, pointer.getSnapshot);
  const { ref, position } = useAnchoredPosition<HTMLDivElement>(x, y, flipAroundPointer);

  const date = formatFullDate(commit.dateLabel);

  return (
    <div
      ref={ref}
      role="tooltip"
      className={`pointer-events-none fixed z-50 max-w-[380px] px-3 py-2 text-xs ${PANEL_SURFACE_TRANSLUCENT}`}
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
            <AuthorLabel commit={commit} />
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
              {commit.parents.map(shortSha).join(', ')}
            </dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}
