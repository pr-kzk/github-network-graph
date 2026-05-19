import type { ViewCommit } from '../lib/transform.types';
import { ROW_HEIGHT } from '../lib/graphMetrics';
import { formatRelativeFromDateString } from '@/shared/format';
import { t } from '@/shared/i18n';
import { AuthorAvatar } from './AuthorAvatar';
import { RefBadge } from './RefBadge';

export type CommitRowProps = {
  commit: ViewCommit;
  isSelected: boolean;
  onSelect: (sha: string) => void;
  graphAreaWidth: number;
};

export function CommitRow({ commit, isSelected, onSelect, graphAreaWidth }: CommitRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      data-sha={commit.sha}
      onClick={() => onSelect(commit.sha)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(commit.sha);
        }
      }}
      data-selected={isSelected ? 'true' : undefined}
      className={[
        'group flex w-full cursor-pointer items-center text-xs',
        'border-b border-slate-900/40',
        isSelected
          ? 'bg-indigo-500/15 ring-1 ring-inset ring-indigo-500/40'
          : 'hover:bg-slate-800/40',
      ].join(' ')}
      style={{ height: ROW_HEIGHT }}
    >
      <div style={{ width: graphAreaWidth }} className="shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 truncate pr-3 text-slate-100">
        {commit.subject || <span className="text-slate-500">{t('commit_detail_no_message')}</span>}
      </div>
      <div className="flex shrink-0 items-center gap-1 pr-3">
        {commit.refs.map((r) => (
          <RefBadge key={`${r.ownerName}:${r.name}`} refItem={r} />
        ))}
      </div>
      <div
        className="flex w-32 shrink-0 items-center gap-1.5 pr-3 text-[11px] text-slate-400"
        title={commit.authorLogin || commit.authorName}
      >
        <AuthorAvatar login={commit.authorLogin} alt={commit.authorName} />
        <span className="min-w-0 truncate">{commit.authorName || t('commit_unknown_author')}</span>
      </div>
      <div className="w-16 shrink-0 truncate pr-3 font-mono text-[10px] text-slate-500">
        {commit.shortSha}
      </div>
      <div
        className="w-16 shrink-0 truncate whitespace-nowrap pr-3 text-right text-[10px] text-slate-500 tabular-nums"
        title={commit.dateLabel || undefined}
      >
        {formatRelativeFromDateString(commit.dateLabel)}
      </div>
    </div>
  );
}
