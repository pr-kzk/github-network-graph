/* oxlint-disable jsx-a11y/prefer-tag-over-role -- A native select or datalist cannot render grouped, highlighted rows beside a free-text field. */
import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef } from 'react';
import { t } from '@/shared/i18n';
import { OPTION_ACTIVE, OPTION_IDLE } from '@/shared/ui';
import type { BranchRows } from '../lib/branchRows';

const OPTION_HEIGHT = 28;
const HEADING_HEIGHT = 26;
const OVERSCAN = 6;

type BranchListProps = {
  listId: string;
  model: BranchRows;
  activeIndex: number;
  selectedSha: string | null;
  optionId: (index: number) => string;
  onPick: (sha: string) => void;
  onHover: (index: number) => void;
};

export function BranchList({
  listId,
  model,
  activeIndex,
  selectedSha,
  optionId,
  onPick,
  onHover,
}: BranchListProps) {
  const { rows, options, rowIndexOfOption } = model;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => (rows[i].kind === 'heading' ? HEADING_HEIGHT : OPTION_HEIGHT),
    overscan: OVERSCAN,
  });

  const activeRow = rowIndexOfOption[activeIndex];
  useEffect(() => {
    if (activeRow !== undefined) virtualizer.scrollToIndex(activeRow);
  }, [virtualizer, activeRow]);

  return (
    <div
      ref={scrollRef}
      id={listId}
      role="listbox"
      aria-label={t('graph_branch_search_label')}
      className="max-h-80 overflow-auto py-1"
    >
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((vi) => {
          const row = rows[vi.index];
          const style = { height: vi.size, transform: `translateY(${vi.start}px)` };
          if (row.kind === 'heading') {
            return (
              <div
                key={row.key}
                role="presentation"
                style={style}
                className="absolute top-0 left-0 flex w-full items-end truncate px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                <span className="truncate">{row.label}</span>
              </div>
            );
          }
          const { branch, optionIndex } = row;
          const active = optionIndex === activeIndex;
          return (
            <button
              key={row.key}
              id={optionId(optionIndex)}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={active}
              aria-posinset={optionIndex + 1}
              aria-setsize={options.length}
              aria-current={branch.sha === selectedSha ? 'true' : undefined}
              onClick={() => onPick(branch.sha)}
              onMouseMove={() => {
                if (!active) onHover(optionIndex);
              }}
              title={row.title}
              style={style}
              className={[
                'absolute top-0 left-0 flex w-full items-center gap-2 border-l-2 px-3 text-left font-mono text-xs',
                branch.sha === selectedSha ? 'font-semibold' : '',
                active ? OPTION_ACTIVE : OPTION_IDLE,
              ].join(' ')}
            >
              <span
                aria-hidden="true"
                className="w-3 shrink-0 text-indigo-600 dark:text-indigo-400"
              >
                {branch.sha === selectedSha ? '✓' : ''}
              </span>
              <span className="min-w-0 truncate">{branch.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
