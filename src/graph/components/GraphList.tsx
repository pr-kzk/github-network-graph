import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useMemo, useRef } from 'react';
import { t, tWith } from '@/shared/i18n';
import { CommitRow } from './CommitRow';
import { GraphCanvas } from './GraphCanvas';
import { ROW_HEIGHT, graphWidth } from '../lib/graphMetrics';
import type { GraphView } from '../lib/transform.types';

// 末尾から何行ぶん残った時点で次ページを fetch するかの閾値。
const LOAD_MORE_THRESHOLD = 20;
// 仮想化の overscan 行数 (上下に余分にレンダする行数)。GraphCanvas の rangeOverscan と揃える。
const VIRTUAL_OVERSCAN = 20;

export type GraphListProps = {
  view: GraphView;
  selectedSha: string | null;
  onSelect: (sha: string) => void;
  onHoverCommit: (sha: string, x: number, y: number) => void;
  onLeaveCommit: (sha: string) => void;
  onContextCommit: (sha: string, x: number, y: number) => void;
  hasMore: boolean;
  loadingMore: boolean;
  olderError: { kind: string; message: string } | null;
  onLoadMore: () => void;
};

export function GraphList({
  view,
  selectedSha,
  onSelect,
  onHoverCommit,
  onLeaveCommit,
  onContextCommit,
  hasMore,
  loadingMore,
  olderError,
  onLoadMore,
}: GraphListProps) {
  const gw = graphWidth(view);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // hasMore のあいだは末尾に「読み込み中…」/「再試行」用の追加 1 行を確保するため count + 1。
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

  // commit 行のレンジ (footer 行を除く) を GraphCanvas に渡す。
  const commitVirtualItems = virtualItems.filter((vi) => vi.index < view.commits.length);
  const rangeStart = commitVirtualItems[0]?.index ?? 0;
  const lastVisibleIndex =
    commitVirtualItems.length > 0
      ? commitVirtualItems[commitVirtualItems.length - 1].index
      : -1;
  const rangeEnd = lastVisibleIndex >= 0 ? lastVisibleIndex + 1 : 0;

  // 末尾に近づいたら次ページを自動 fetch。
  // commitVirtualItems (毎 render 新配列) を deps に取らず、末尾 index の number だけで判定する。
  useEffect(() => {
    if (!hasMore || loadingMore || olderError) return;
    if (view.commits.length === 0 || lastVisibleIndex < 0) return;
    if (lastVisibleIndex >= view.commits.length - LOAD_MORE_THRESHOLD) {
      onLoadMore();
    }
  }, [
    lastVisibleIndex,
    hasMore,
    loadingMore,
    olderError,
    onLoadMore,
    view.commits.length,
  ]);

  // selectedSha が変わったら scrollToIndex で中央へ。既に十分見えている場合は動かさない。
  const selectedRow = useMemo(() => {
    if (!selectedSha) return null;
    const idx = view.commits.findIndex((c) => c.sha === selectedSha);
    return idx >= 0 ? idx : null;
  }, [selectedSha, view.commits]);

  useEffect(() => {
    if (selectedRow === null) return;
    const items = virtualizer.getVirtualItems();
    const visible = items.find((vi) => vi.index === selectedRow);
    if (visible) {
      const container = scrollRef.current;
      if (container) {
        const cTop = container.scrollTop;
        const cBottom = cTop + container.clientHeight;
        const marginTop = cTop + ROW_HEIGHT;
        const marginBottom = cBottom - ROW_HEIGHT;
        const rowTop = visible.start;
        const rowBottom = visible.start + visible.size;
        if (rowTop >= marginTop && rowBottom <= marginBottom) return;
      }
    }
    virtualizer.scrollToIndex(selectedRow, { align: 'center', behavior: 'smooth' });
  }, [selectedRow, virtualizer]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="flex items-center border-b border-slate-200 bg-slate-50 px-0 text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/40"
        style={{ height: 24 }}
      >
        <div style={{ width: gw }} className="shrink-0 px-3">
          Graph
        </div>
        <div className="min-w-0 flex-1 truncate pr-3">Subject</div>
        <div className="w-32 shrink-0 pr-3">Author</div>
        <div className="w-16 shrink-0 pr-3">SHA</div>
        <div className="w-16 shrink-0 pr-3 text-right">Date</div>
      </div>
      <div ref={scrollRef} className="relative flex-1 overflow-auto">
        <div className="relative" style={{ height: totalSize }}>
          <GraphCanvas
            view={view}
            selectedSha={selectedSha}
            width={gw}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            rangeOverscan={VIRTUAL_OVERSCAN}
            onSelectCommit={onSelect}
            onHoverCommit={onHoverCommit}
            onLeaveCommit={onLeaveCommit}
            onContextMenu={onContextCommit}
          />
          <div role="list" className="relative z-0">
            {virtualItems.map((vi) => {
              const isFooter = vi.index >= view.commits.length;
              const key = isFooter ? '__footer__' : view.commits[vi.index].sha;
              return (
                <div
                  key={key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: vi.size,
                    transform: `translateY(${vi.start}px)`,
                  }}
                >
                  {isFooter ? (
                    <FooterRow
                      loadingMore={loadingMore}
                      olderError={olderError}
                      onRetry={onLoadMore}
                      graphAreaWidth={gw}
                    />
                  ) : (
                    <CommitRow
                      commit={view.commits[vi.index]}
                      isSelected={view.commits[vi.index].sha === selectedSha}
                      onSelect={onSelect}
                      graphAreaWidth={gw}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {view.commits.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">{t('graph_empty_commits')}</div>
        ) : null}
      </div>
    </div>
  );
}

function FooterRow({
  loadingMore,
  olderError,
  onRetry,
  graphAreaWidth,
}: {
  loadingMore: boolean;
  olderError: { kind: string; message: string } | null;
  onRetry: () => void;
  graphAreaWidth: number;
}) {
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
