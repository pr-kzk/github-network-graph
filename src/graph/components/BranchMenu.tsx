import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { t, tWith } from '@/shared/i18n';
import { PANEL_SURFACE } from '@/shared/ui';
import { useActiveIndex } from '../hooks/useActiveIndex';
import { useDismissOnOutsidePress } from '../hooks/useDismissOnOutsidePress';
import { buildBranchRows } from '../lib/branchRows';
import type { GraphBranch, GraphForkBranches } from '../lib/transform.types';
import { BranchList } from './BranchList';
import { Spinner } from './Spinner';

export type BranchMenuProps = {
  branches: GraphBranch[];
  forkBranches: GraphForkBranches[];
  selectedSha: string | null;
  busy: boolean;
  onSelect: (sha: string) => void;
};

const PAGE_STEP = 8;

export function BranchMenu({
  branches,
  forkBranches,
  selectedSha,
  busy,
  onSelect,
}: BranchMenuProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listId = useId();
  const optionId = useCallback((index: number) => `${listId}-option-${index}`, [listId]);

  const model = useMemo(
    () => buildBranchRows(branches, forkBranches, query, t('graph_branch_group_repo')),
    [branches, forkBranches, query],
  );
  const { options } = model;
  const { activeIndex, setActiveIndex, move, reset } = useActiveIndex(options.length, 0);
  const totalCount = branches.length + forkBranches.reduce((n, f) => n + f.branches.length, 0);

  function close() {
    setOpen(false);
    setQuery('');
    reset();
  }

  function openMenu() {
    setActiveIndex(
      Math.max(
        0,
        options.findIndex((o) => o.branch.sha === selectedSha),
      ),
    );
    setOpen(true);
  }

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useDismissOnOutsidePress(rootRef, close, open);

  function closeAndRestoreFocus() {
    close();
    triggerRef.current?.focus();
  }

  const jump = (sha: string) => {
    onSelect(sha);
    closeAndRestoreFocus();
  };

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      closeAndRestoreFocus();
      return;
    }
    if (e.key === 'Tab') {
      close();
      return;
    }
    const step = { ArrowDown: 1, ArrowUp: -1, PageDown: PAGE_STEP, PageUp: -PAGE_STEP }[e.key];
    if (step !== undefined) {
      e.preventDefault();
      move(step);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = options[activeIndex];
      if (target) jump(target.branch.sha);
    }
  }

  const activeOption = options[activeIndex];

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-busy={busy}
        title={busy ? t('graph_seek_busy') : undefined}
        onClick={() => (open ? close() : openMenu())}
        className="flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800 dark:hover:bg-slate-800"
      >
        {busy ? <Spinner className="h-3 w-3 text-indigo-600 dark:text-indigo-400" /> : null}
        {tWith('graph_branch_button', { count: String(totalCount) })}
        <span aria-hidden="true" className="text-[9px]">
          ▾
        </span>
      </button>
      {open ? (
        <div className={`absolute right-0 z-50 mt-1 w-80 overflow-hidden ${PANEL_SURFACE}`}>
          <div className="border-b border-slate-200 p-2 dark:border-slate-800">
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-label={t('graph_branch_search_label')}
              aria-autocomplete="list"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={activeOption ? optionId(activeIndex) : undefined}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                reset();
              }}
              onKeyDown={handleKeyDown}
              placeholder={t('graph_branch_search_placeholder')}
              className="w-full rounded bg-slate-100 px-2 py-1 text-xs text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"
            />
          </div>
          {options.length === 0 ? (
            <div className="px-3 py-3 text-xs text-slate-500">{t('graph_branch_no_match')}</div>
          ) : (
            <BranchList
              listId={listId}
              model={model}
              activeIndex={activeIndex}
              selectedSha={selectedSha}
              optionId={optionId}
              onPick={jump}
              onHover={setActiveIndex}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
