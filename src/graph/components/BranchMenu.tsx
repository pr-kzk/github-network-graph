import { useEffect, useMemo, useRef, useState } from 'react';
import { t, tWith } from '@/shared/i18n';
import type { GraphBranch } from '../lib/transform.types';

export type BranchMenuProps = {
  branches: GraphBranch[];
  onSelect: (sha: string) => void;
};

export function BranchMenu({ branches, onSelect }: BranchMenuProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter((b) => b.name.toLowerCase().includes(q));
  }, [branches, query]);

  function close() {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  }

  // 開いたら検索欄へフォーカス (DOM 副作用のみ)。
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // 外側クリックで閉じる。
  useEffect(() => {
    if (!open) return;
    function handleDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    }
    document.addEventListener('mousedown', handleDown, true);
    return () => document.removeEventListener('mousedown', handleDown, true);
  }, [open]);

  // ハイライト行を可視域へスクロール。
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const el = list?.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  function jump(sha: string) {
    onSelect(sha);
    close();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filtered[activeIndex];
      if (target) jump(target.sha);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        className="flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800 dark:hover:bg-slate-800"
      >
        {tWith('graph_branch_button', { count: String(branches.length) })}
        <span aria-hidden="true" className="text-[9px]">
          ▾
        </span>
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-1 w-64 overflow-hidden rounded-md border border-slate-300 bg-white shadow-xl ring-1 ring-black/10 dark:border-slate-700 dark:bg-slate-900 dark:ring-black/40">
          <div className="border-b border-slate-200 p-2 dark:border-slate-800">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder={t('graph_branch_search_placeholder')}
              className="w-full rounded bg-slate-100 px-2 py-1 text-xs text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"
            />
          </div>
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-xs text-slate-500">
              {t('graph_branch_no_match')}
            </div>
          ) : (
            <ul ref={listRef} role="listbox" className="max-h-64 overflow-auto py-1">
              {filtered.map((b, i) => (
                <li key={`${b.sha}:${b.name}`} role="option" aria-selected={i === activeIndex}>
                  <button
                    type="button"
                    onClick={() => jump(b.sha)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={[
                      'block w-full truncate px-3 py-1.5 text-left font-mono text-xs',
                      i === activeIndex
                        ? 'bg-indigo-600/20 text-slate-900 dark:bg-indigo-600/40 dark:text-slate-100'
                        : 'text-slate-700 dark:text-slate-300',
                    ].join(' ')}
                    title={b.name}
                  >
                    {b.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
