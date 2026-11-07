import { memo, type FocusEvent, type MouseEvent } from 'react';
import type { ViewCommit } from '../lib/transform.types';
import { ROW_HEIGHT } from '../lib/graphMetrics';
import { authorColumnWidth, DATE_WIDTH, SHA_WIDTH, type ListColumns } from '../lib/listColumns';
import { formatRelativeFromDateString } from '@/shared/format';
import { t } from '@/shared/i18n';
import { AuthorAvatar } from './AuthorAvatar';
import { HighlightedText } from './HighlightedText';
import { RefBadge } from './RefBadge';
import { FOCUS_RING_INSET } from '@/shared/ui';

export type RowHandlers = {
  onSelect: (sha: string) => void;
  onContextMenu: (sha: string, clientX: number, clientY: number) => void;
  onHover: (sha: string, clientX: number, clientY: number) => void;
  onKeyboardFocus: (sha: string, clientX: number, clientY: number) => void;
  onLeave: () => void;
};

type CommitRowProps = {
  commit: ViewCommit;
  isSelected: boolean;
  isMatch: boolean;
  query: string;
  isTabStop: boolean;
  isFlashing: boolean;
  columns: ListColumns;
  handlers: RowHandlers;
  graphAreaWidth: number;
};

function hasKeyboardFocus(element: HTMLElement): boolean {
  try {
    return element.matches(':focus-visible');
  } catch {
    return false;
  }
}

function CommitRowImpl({
  commit,
  isSelected,
  isMatch,
  query,
  isTabStop,
  isFlashing,
  columns,
  handlers: { onSelect, onContextMenu, onHover, onKeyboardFocus, onLeave },
  graphAreaWidth,
}: CommitRowProps) {
  const mark = (text: string) => (isMatch ? <HighlightedText text={text} query={query} /> : text);

  function handleContextMenu(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    if (e.clientX === 0 && e.clientY === 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      onContextMenu(commit.sha, rect.left + graphAreaWidth, rect.bottom);
    } else {
      onContextMenu(commit.sha, e.clientX, e.clientY);
    }
  }

  function handleFocus(e: FocusEvent<HTMLButtonElement>) {
    if (!hasKeyboardFocus(e.currentTarget)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onKeyboardFocus(commit.sha, rect.left + graphAreaWidth + 48, rect.top + ROW_HEIGHT / 2);
  }

  return (
    <button
      type="button"
      data-sha={commit.sha}
      tabIndex={isTabStop ? 0 : -1}
      aria-current={isSelected ? 'true' : undefined}
      onClick={() => onSelect(commit.sha)}
      onContextMenu={handleContextMenu}
      onMouseMove={(e) => onHover(commit.sha, e.clientX, e.clientY)}
      onMouseLeave={onLeave}
      onFocus={handleFocus}
      onBlur={onLeave}
      data-selected={isSelected ? 'true' : undefined}
      data-match={isMatch ? 'true' : undefined}
      className={[
        'group flex w-full cursor-pointer items-center text-left text-xs',
        isFlashing ? 'row-flash' : '',
        `border-b border-slate-200 ${FOCUS_RING_INSET} dark:border-slate-900/40`,
        isSelected
          ? 'bg-indigo-500/15 ring-1 ring-inset ring-indigo-500/40'
          : isMatch
            ? 'bg-amber-500/10 hover:bg-amber-500/20'
            : 'hover:bg-slate-100 dark:hover:bg-slate-800/40',
      ].join(' ')}
      style={{ height: ROW_HEIGHT }}
    >
      <span style={{ width: graphAreaWidth }} className="shrink-0" aria-hidden="true" />
      <span
        style={{ width: authorColumnWidth(columns.authorName) }}
        className="flex shrink-0 items-center gap-1.5 pr-3 text-[11px] text-slate-600 dark:text-slate-400"
        title={commit.authorLogin || commit.authorName}
      >
        <AuthorAvatar login={commit.authorLogin} alt={commit.authorName} />
        {columns.authorName ? (
          <span className="min-w-0 truncate">
            {commit.authorName ? mark(commit.authorName) : t('commit_unknown_author')}
          </span>
        ) : null}
      </span>
      <span className="min-w-40 flex-1 truncate pr-3 text-slate-900 dark:text-slate-100">
        {commit.subject ? (
          mark(commit.subject)
        ) : (
          <span className="text-slate-400 dark:text-slate-500">
            {t('commit_detail_no_message')}
          </span>
        )}
      </span>
      <span className="flex min-w-0 max-w-[40%] shrink items-center gap-1 overflow-hidden pr-3">
        {commit.refs.map((r) => (
          <RefBadge key={`${r.ownerName}:${r.name}`} refItem={r} />
        ))}
      </span>
      {columns.sha ? (
        <span
          style={{ width: SHA_WIDTH }}
          className="shrink-0 truncate pr-3 font-mono text-[10px] text-slate-500"
        >
          {mark(commit.shortSha)}
        </span>
      ) : null}
      {columns.date ? (
        <span
          style={{ width: DATE_WIDTH }}
          className="shrink-0 truncate whitespace-nowrap pr-3 text-right text-[10px] text-slate-500 tabular-nums"
          title={commit.dateLabel || undefined}
        >
          {formatRelativeFromDateString(commit.dateLabel)}
        </span>
      ) : null}
    </button>
  );
}

export const CommitRow = memo(CommitRowImpl);
