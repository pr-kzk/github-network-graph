/* oxlint-disable jsx-a11y/prefer-tag-over-role -- A native select or datalist cannot render grouped, highlighted rows beside a free-text field. */
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { t } from '@/shared/i18n';
import { isSameRepo } from '@/shared/storage';
import {
  FOCUS_RING,
  FOCUS_RING_FLUSH,
  OPTION_ACTIVE,
  OPTION_IDLE,
  PANEL_SURFACE,
} from '@/shared/ui';
import { useLocalValue } from '@/shared/useLocalValue';
import { useActiveIndex } from '../hooks/useActiveIndex';
import { useDismissOnOutsidePress } from '../hooks/useDismissOnOutsidePress';
import { parseRepoFromInput, type RepoRef } from '../lib/parseUrl';

type RepoSwitcherProps = {
  owner: string;
  repo: string;
  onSwitch: (target: RepoRef) => void;
};

const NO_SUGGESTION = -1;

export function RepoSwitcher({ owner, repo, onSwitch }: RepoSwitcherProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const [edited, setEdited] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const chipRef = useRef<HTMLButtonElement | null>(null);
  const returnFocus = useRef(false);
  const errorId = useId();
  const listId = useId();
  const optionId = (index: number) => `${listId}-option-${index}`;
  const recent = useLocalValue('recentRepos');

  const suggestions = useMemo(() => {
    const needle = edited ? value.trim().toLowerCase() : '';
    return recent.filter(
      (entry) =>
        !isSameRepo(entry, { owner, repo }) &&
        `${entry.owner}/${entry.repo}`.toLowerCase().includes(needle),
    );
  }, [recent, value, edited, owner, repo]);
  const { activeIndex, setActiveIndex, move } = useActiveIndex(suggestions.length, NO_SUGGESTION);

  useEffect(() => {
    if (editing || !returnFocus.current) return;
    returnFocus.current = false;
    chipRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  useDismissOnOutsidePress(rootRef, () => setEditing(false), editing);

  function startEditing() {
    setValue(`${owner}/${repo}`);
    setError(false);
    setEdited(false);
    setActiveIndex(NO_SUGGESTION);
    setEditing(true);
  }

  function cancel() {
    returnFocus.current = true;
    setEditing(false);
  }

  function choose(target: RepoRef) {
    setEditing(false);
    if (!isSameRepo(target, { owner, repo })) onSwitch(target);
  }

  function submit() {
    const suggestion = suggestions[activeIndex];
    if (suggestion) {
      choose({ owner: suggestion.owner, repo: suggestion.repo });
      return;
    }
    const parsed = parseRepoFromInput(value);
    if (!parsed) {
      setError(true);
      return;
    }
    choose(parsed);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    }
  }

  return (
    <div ref={rootRef} className="relative flex items-center gap-1">
      {editing ? (
        <>
          <input
            ref={inputRef}
            value={value}
            role="combobox"
            aria-label={t('graph_repoform_label')}
            aria-autocomplete="list"
            aria-expanded={suggestions.length > 0}
            aria-controls={suggestions.length > 0 ? listId : undefined}
            aria-activedescendant={suggestions[activeIndex] ? optionId(activeIndex) : undefined}
            aria-invalid={error}
            aria-describedby={error ? errorId : undefined}
            autoComplete="off"
            spellCheck={false}
            placeholder={t('graph_repoform_placeholder')}
            onChange={(e) => {
              setValue(e.target.value);
              setError(false);
              setEdited(true);
              setActiveIndex(NO_SUGGESTION);
            }}
            onKeyDown={handleKeyDown}
            className="w-72 max-w-full rounded-md border border-slate-300 bg-white px-2 py-1 font-mono text-xs text-slate-900 outline-none focus:border-indigo-500 aria-invalid:border-rose-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400"
          />
          <div
            className={`absolute top-full left-0 z-50 mt-1 w-72 max-w-[90vw] overflow-hidden text-xs ${PANEL_SURFACE}`}
          >
            {error ? (
              <p id={errorId} role="alert" className="px-3 py-2 text-rose-600 dark:text-rose-400">
                {t('graph_repoform_error')}
              </p>
            ) : null}
            <div id={listId} role="listbox" aria-label={t('graph_repo_switch_recent')}>
              {suggestions.map((entry, i) => (
                <button
                  key={`${entry.owner}/${entry.repo}`}
                  id={optionId(i)}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  aria-selected={i === activeIndex}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => choose({ owner: entry.owner, repo: entry.repo })}
                  className={[
                    'block w-full truncate border-l-2 px-3 py-1.5 text-left font-mono',
                    i === activeIndex ? `${OPTION_ACTIVE} font-semibold` : OPTION_IDLE,
                  ].join(' ')}
                >
                  {entry.owner}/{entry.repo}
                </button>
              ))}
            </div>
            <p className="border-t border-slate-200 px-3 py-1.5 text-[10px] text-slate-500 dark:border-slate-800">
              {t('graph_repo_switch_hint')}
            </p>
          </div>
        </>
      ) : (
        <>
          <button
            ref={chipRef}
            type="button"
            aria-label={t('graph_repo_switch_label')}
            title={t('graph_repo_switch_label')}
            onClick={startEditing}
            className={`flex items-center gap-1 rounded-md bg-slate-200 px-2 py-0.5 font-mono text-xs text-slate-800 hover:bg-slate-300 ${FOCUS_RING} dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700`}
          >
            {owner}/{repo}
            <span aria-hidden="true" className="text-[9px]">
              ▾
            </span>
          </button>
          <a
            href={`https://github.com/${owner}/${repo}`}
            target="_blank"
            rel="noreferrer"
            aria-label={t('graph_repo_open_github')}
            title={t('graph_repo_open_github')}
            className={`rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800 ${FOCUS_RING_FLUSH} dark:hover:bg-slate-800 dark:hover:text-slate-100`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 12 12"
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 2.5H2.5v7h7V7M7 2.5h2.5V5M9.5 2.5L5.5 6.5" />
            </svg>
          </a>
        </>
      )}
    </div>
  );
}
