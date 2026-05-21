import { useLayoutEffect, useRef, useState } from 'react';
import type { ViewCommit } from '../lib/transform.types';
import { formatFullDate } from '@/shared/format';
import { t } from '@/shared/i18n';
import { AuthorAvatar } from './AuthorAvatar';
import { RefBadge } from './RefBadge';

export type CommitTooltipProps = {
  commit: ViewCommit;
  // ポインタの client 座標。ここを基準に右下に出す。
  x: number;
  y: number;
};

const OFFSET = 14;
const VIEWPORT_MARGIN = 8;

export function CommitTooltip({ commit, x, y }: CommitTooltipProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({
    left: x + OFFSET,
    top: y + OFFSET,
  });

  // 実サイズ計測 → ビューポート外にはみ出す場合は反対側にフリップする。
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = x + OFFSET;
    let top = y + OFFSET;
    if (left + rect.width + VIEWPORT_MARGIN > vw) left = x - OFFSET - rect.width;
    if (top + rect.height + VIEWPORT_MARGIN > vh) top = y - OFFSET - rect.height;
    if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;
    if (top < VIEWPORT_MARGIN) top = VIEWPORT_MARGIN;
    setPos({ left, top });
  }, [commit.sha, x, y]);

  const date = formatFullDate(commit.dateLabel);

  return (
    <div
      ref={ref}
      role="tooltip"
      className="pointer-events-none fixed z-50 max-w-[380px] rounded-md border border-slate-300 bg-white/95 px-3 py-2 text-xs text-slate-900 shadow-xl ring-1 ring-black/10 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100 dark:ring-black/40"
      style={{ left: pos.left, top: pos.top }}
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
        <dt className="text-slate-500">Commit</dt>
        <dd className="font-mono text-slate-800 dark:text-slate-200">{commit.shortSha}</dd>
        <dt className="text-slate-500">Author</dt>
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
            <dt className="text-slate-500">Date</dt>
            <dd className="font-mono text-slate-800 dark:text-slate-200">{date}</dd>
          </>
        ) : null}
        {commit.parents.length > 0 ? (
          <>
            <dt className="text-slate-500">Parents</dt>
            <dd className="truncate font-mono text-slate-800 dark:text-slate-200">
              {commit.parents.map((p) => p.slice(0, 7)).join(', ')}
            </dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}
