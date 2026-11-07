import { useVirtualizer } from '@tanstack/react-virtual';
import { memo, useEffect, useMemo, useRef } from 'react';
import { t, tWith } from '@/shared/i18n';
import { CommitRow } from './CommitRow';
import { GraphCanvas } from './GraphCanvas';
import { GraphListFooter } from './GraphListFooter';
import { useElementWidth } from '../hooks/useElementWidth';
import { useFocusSelectedRow } from '../hooks/useFocusSelectedRow';
import { useRevealSelectedRow } from '../hooks/useRevealSelectedRow';
import type { GraphErrorInfo } from '../lib/networkApi';
import { ROW_HEIGHT, createGraphLayout } from '../lib/graphMetrics';
import { collectPath, priorityLanes } from '../lib/laneBudget';
import { visibleColumns } from '../lib/listColumns';
import type { GraphView, ViewCommit } from '../lib/transform.types';

const LOAD_MORE_THRESHOLD = 20;
const VIRTUAL_OVERSCAN = 20;

type GraphListProps = {
  view: GraphView;
  selectedSha: string | null;
  flashSha: string | null;
  commitBySha: ReadonlyMap<string, ViewCommit>;
  childrenBySha: ReadonlyMap<string, readonly string[]>;
  matchShas: ReadonlySet<string>;
  query: string;
  onSelect: (sha: string) => void;
  onHoverCommit: (sha: string, x: number, y: number) => void;
  onKeyboardFocusCommit: (sha: string, x: number, y: number) => void;
  onLeaveCommit: () => void;
  onContextCommit: (sha: string, x: number, y: number) => void;
  hasMore: boolean;
  loadingMore: boolean;
  olderError: GraphErrorInfo | null;
  onLoadMore: () => void;
};

function GraphListImpl({
  view,
  selectedSha,
  flashSha,
  commitBySha,
  childrenBySha,
  matchShas,
  query,
  onSelect,
  onHoverCommit,
  onKeyboardFocusCommit,
  onLeaveCommit,
  onContextCommit,
  hasMore,
  loadingMore,
  olderError,
  onLoadMore,
}: GraphListProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const listWidth = useElementWidth(scrollRef);
  const priority = useMemo(() => priorityLanes(view.commits), [view.commits]);
  const layout = useMemo(
    () => createGraphLayout(view.laneCount, listWidth, priority),
    [view.laneCount, listWidth, priority],
  );
  const gw = layout.width;
  const textAreaWidth = listWidth - gw;
  const columns = useMemo(() => visibleColumns(textAreaWidth), [textAreaWidth]);

  const pathShas = useMemo(
    () =>
      layout.crowded && selectedSha && commitBySha.has(selectedSha)
        ? collectPath(selectedSha, commitBySha, childrenBySha)
        : null,
    [layout.crowded, selectedSha, commitBySha, childrenBySha],
  );

  const showFooterRow = hasMore || loadingMore || olderError !== null;
  const itemCount = view.commits.length + (showFooterRow ? 1 : 0);

  const virtualizer = useVirtualizer({
    count: itemCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: VIRTUAL_OVERSCAN,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  const lastVisibleIndex = Math.min(
    virtualItems[virtualItems.length - 1]?.index ?? -1,
    view.commits.length - 1,
  );
  const rangeStart = lastVisibleIndex >= 0 ? virtualItems[0].index : 0;
  const rangeEnd = lastVisibleIndex + 1;

  useEffect(() => {
    if (!hasMore || loadingMore || olderError) return;
    if (view.commits.length === 0 || lastVisibleIndex < 0) return;
    if (lastVisibleIndex >= view.commits.length - LOAD_MORE_THRESHOLD) {
      onLoadMore();
    }
  }, [lastVisibleIndex, hasMore, loadingMore, olderError, onLoadMore, view.commits.length]);

  const selectedRow = selectedSha ? (commitBySha.get(selectedSha)?.row ?? null) : null;

  useRevealSelectedRow(virtualizer, scrollRef, selectedRow);
  useFocusSelectedRow(scrollRef, selectedSha);

  const tabStopSha = selectedRow !== null ? selectedSha : (view.commits[rangeStart]?.sha ?? null);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="flex items-center border-b border-slate-200 bg-slate-50 px-0 text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/40"
        style={{ height: 24 }}
      >
        <div
          style={{ width: gw }}
          className="flex shrink-0 items-center justify-between gap-1 px-3"
        >
          <span className="truncate">{t('graph_column_graph')}</span>
          {layout.foldedCount > 0 ? (
            <abbr
              title={tWith('graph_lanes_folded_hint', { count: String(layout.foldedCount) })}
              className="shrink-0 cursor-help rounded-full no-underline bg-slate-200 px-1.5 py-px text-[10px] font-semibold normal-case tracking-normal text-slate-700 tabular-nums dark:bg-slate-800 dark:text-slate-200"
            >
              {tWith('graph_lanes_folded', { count: String(layout.foldedCount) })}
            </abbr>
          ) : null}
        </div>
        {columns.authorName ? (
          <div className="w-32 shrink-0 pr-3">{t('graph_column_author')}</div>
        ) : (
          <div className="w-8 shrink-0" />
        )}
        <div className="min-w-0 flex-1 truncate pr-3">{t('graph_column_subject')}</div>
        {columns.sha ? <div className="w-16 shrink-0 pr-3">{t('graph_column_sha')}</div> : null}
        {columns.date ? (
          <div className="w-16 shrink-0 pr-3 text-right">{t('graph_column_date')}</div>
        ) : null}
      </div>
      <div ref={scrollRef} className="relative flex-1 overflow-auto">
        <div className="relative" style={{ height: totalSize }}>
          <GraphCanvas
            view={view}
            selectedSha={selectedSha}
            pathShas={pathShas}
            layout={layout}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
          />
          <ul className="relative z-0" data-commit-list="" aria-label={t('graph_list_label')}>
            {virtualItems.map((vi) => {
              const commit = vi.index < view.commits.length ? view.commits[vi.index] : null;
              const key = commit ? commit.sha : '__footer__';
              const isMatch = commit !== null && matchShas.has(commit.sha);
              return (
                <li
                  key={key}
                  aria-posinset={commit ? vi.index + 1 : undefined}
                  aria-setsize={commit ? view.commits.length : undefined}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: vi.size,
                    transform: `translateY(${vi.start}px)`,
                  }}
                >
                  {commit === null ? (
                    <GraphListFooter
                      loadingMore={loadingMore}
                      olderError={olderError}
                      onRetry={onLoadMore}
                      graphAreaWidth={gw}
                    />
                  ) : (
                    <CommitRow
                      commit={commit}
                      isSelected={commit.sha === selectedSha}
                      isMatch={isMatch}
                      query={isMatch ? query : ''}
                      isTabStop={commit.sha === tabStopSha}
                      isFlashing={commit.sha === flashSha}
                      columns={columns}
                      onSelect={onSelect}
                      onContextMenu={onContextCommit}
                      onHover={onHoverCommit}
                      onKeyboardFocus={onKeyboardFocusCommit}
                      onLeave={onLeaveCommit}
                      graphAreaWidth={gw}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        {view.commits.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">{t('graph_empty_commits')}</div>
        ) : null}
      </div>
    </div>
  );
}

export const GraphList = memo(GraphListImpl);
