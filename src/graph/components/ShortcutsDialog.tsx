import { useEffect, useId, useRef, type KeyboardEvent } from 'react';
import { t, type MessageKey } from '@/shared/i18n';

type Shortcut = { keys: readonly string[]; label: MessageKey };

const SHORTCUTS: readonly Shortcut[] = [
  { keys: ['j', '↓'], label: 'graph_shortcut_next' },
  { keys: ['k', '↑'], label: 'graph_shortcut_previous' },
  { keys: ['g', 'Home'], label: 'graph_shortcut_first' },
  { keys: ['G', 'End'], label: 'graph_shortcut_last' },
  { keys: ['['], label: 'graph_shortcut_parent' },
  { keys: [']'], label: 'graph_shortcut_child' },
  { keys: ['Enter'], label: 'graph_shortcut_open_detail' },
  { keys: ['Esc'], label: 'graph_shortcut_back_to_list' },
  { keys: ['/'], label: 'graph_shortcut_search' },
  { keys: ['Enter', 'Shift+Enter'], label: 'graph_shortcut_search_step' },
  { keys: ['Esc'], label: 'graph_shortcut_search_clear' },
  { keys: ['Shift+F10'], label: 'graph_shortcut_context_menu' },
  { keys: ['?'], label: 'graph_shortcut_help' },
];

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

type ShortcutsDialogProps = {
  onClose: () => void;
};

export function ShortcutsDialog({ onClose }: ShortcutsDialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDialogElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const opener = document.activeElement;
    closeRef.current?.focus();
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <dialog
        open
        ref={panelRef}
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
        className="static m-0 max-h-full w-full max-w-md overflow-auto rounded-lg border border-slate-300 bg-white p-5 text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-sm font-semibold">
            {t('graph_shortcuts_title')}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-md bg-slate-200 px-2.5 py-1 text-xs text-slate-800 hover:bg-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            {t('graph_shortcuts_close')}
          </button>
        </div>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 text-xs">
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.label} className="contents">
              <dt className="flex flex-wrap gap-1">
                {shortcut.keys.map((key) => (
                  <kbd
                    key={key}
                    className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {key}
                  </kbd>
                ))}
              </dt>
              <dd className="text-slate-700 dark:text-slate-300">{t(shortcut.label)}</dd>
            </div>
          ))}
        </dl>
      </dialog>
    </div>
  );
}
