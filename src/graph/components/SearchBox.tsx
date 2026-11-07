import type { KeyboardEvent, RefObject } from 'react';
import { t, tWith } from '@/shared/i18n';

export type SearchBoxProps = {
  query: string;
  matchCount: number;
  loadedCount: number;
  hasMore: boolean;
  loadingMore: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onQueryChange: (query: string) => void;
  onStep: (direction: 1 | -1) => void;
  onLoadOlder: () => void;
};

const STEP_BUTTON_CLASS =
  'flex size-6 items-center justify-center rounded text-slate-600 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-400 dark:hover:bg-slate-800';

export function SearchBox({
  query,
  matchCount,
  loadedCount,
  hasMore,
  loadingMore,
  inputRef,
  onQueryChange,
  onStep,
  onLoadOlder,
}: SearchBoxProps) {
  const searching = query.trim() !== '';

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      onStep(event.shiftKey ? -1 : 1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (query === '') event.currentTarget.blur();
      else onQueryChange('');
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-0.5 rounded-md bg-slate-100 pr-0.5 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-sky-500 dark:bg-slate-900 dark:ring-slate-800">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-label={t('graph_search_label')}
          placeholder={t('graph_search_placeholder')}
          autoComplete="off"
          spellCheck={false}
          className="w-64 bg-transparent px-2.5 py-1 text-xs text-slate-900 outline-none placeholder:text-slate-500 dark:text-slate-100"
        />
        <button
          type="button"
          aria-label={t('graph_search_previous')}
          title={t('graph_search_previous')}
          disabled={matchCount === 0}
          onClick={() => onStep(-1)}
          className={STEP_BUTTON_CLASS}
        >
          <span aria-hidden="true">↑</span>
        </button>
        <button
          type="button"
          aria-label={t('graph_search_next')}
          title={t('graph_search_next')}
          disabled={matchCount === 0}
          onClick={() => onStep(1)}
          className={STEP_BUTTON_CLASS}
        >
          <span aria-hidden="true">↓</span>
        </button>
      </div>
      <output aria-live="polite" className="flex items-center gap-2 text-xs">
        {searching ? (
          <>
            <span
              className={
                matchCount === 0
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-slate-700 dark:text-slate-300'
              }
            >
              {matchCount === 0
                ? tWith('graph_search_none', { loaded: String(loadedCount) })
                : tWith('graph_search_count', {
                    matches: String(matchCount),
                    loaded: String(loadedCount),
                  })}
            </span>
            {hasMore ? (
              <>
                <span className="text-slate-500">{t('graph_search_partial')}</span>
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={onLoadOlder}
                  className="rounded-md bg-slate-200 px-2 py-0.5 text-slate-800 hover:bg-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-wait disabled:opacity-60 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  {loadingMore ? t('graph_footer_loading_more') : t('graph_search_load_older')}
                </button>
              </>
            ) : null}
          </>
        ) : null}
      </output>
    </div>
  );
}
