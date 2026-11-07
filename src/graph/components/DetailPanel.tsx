import { useRef, type KeyboardEvent, type PointerEvent, type ReactNode, type Ref } from 'react';
import { t } from '@/shared/i18n';
import type { DetailLayout } from '../hooks/useDetailLayout';

const KEYBOARD_STEP = 24;

type DetailPanelProps = {
  layout: DetailLayout;
  panelRef: Ref<HTMLElement>;
  hasSelection: boolean;
  children: ReactNode;
};

function Chevron({ pointsLeft }: { pointsLeft: boolean }) {
  return (
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
      <path d={pointsLeft ? 'M7.5 2.5L4 6l3.5 3.5' : 'M4.5 2.5L8 6 4.5 9.5'} />
    </svg>
  );
}

export function DetailPanel({ layout, panelRef, hasSelection, children }: DetailPanelProps) {
  const { width, collapsed, previewWidth, commitWidth, setCollapsed } = layout;
  const drag = useRef<{ startX: number; startWidth: number; latest: number } | null>(null);

  function handlePointerDown(e: PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { startX: e.clientX, startWidth: width, latest: width };
  }

  function handlePointerMove(e: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current) return;
    current.latest = current.startWidth + (current.startX - e.clientX);
    previewWidth(current.latest);
  }

  function handlePointerEnd() {
    const current = drag.current;
    if (!current) return;
    drag.current = null;
    commitWidth(current.latest);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowLeft') commitWidth(width + KEYBOARD_STEP);
    else if (e.key === 'ArrowRight') commitWidth(width - KEYBOARD_STEP);
    else return;
    e.preventDefault();
  }

  const toggleLabel = collapsed ? t('graph_detail_expand') : t('graph_detail_collapse');

  return (
    <aside
      ref={panelRef}
      tabIndex={-1}
      data-commit-detail=""
      aria-label={t('commit_detail_panel_label')}
      style={collapsed ? undefined : { width }}
      className={[
        'relative flex shrink-0 flex-col border-l border-slate-200 bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sky-500 dark:border-slate-800 dark:bg-slate-950/50',
        collapsed ? 'w-9 items-center' : 'max-w-[50vw] min-w-[280px]',
      ].join(' ')}
    >
      {collapsed ? null : (
        <button
          type="button"
          aria-label={t('graph_detail_resize')}
          title={t('graph_detail_resize')}
          aria-keyshortcuts="ArrowLeft ArrowRight"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onKeyDown={handleKeyDown}
          className="absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize touch-none hover:bg-indigo-500/40 focus-visible:bg-indigo-500/60 focus-visible:outline-none"
        />
      )}
      <div
        className={
          collapsed
            ? 'contents'
            : 'flex h-8 shrink-0 items-center justify-end border-b border-slate-200 px-1.5 dark:border-slate-800'
        }
      >
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-label={toggleLabel}
          title={toggleLabel}
          onClick={() => setCollapsed(!collapsed)}
          className={
            collapsed
              ? 'flex h-full w-full flex-col items-center gap-3 pt-3 text-slate-600 hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sky-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              : 'rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-sky-500 dark:hover:bg-slate-800 dark:hover:text-slate-100'
          }
        >
          <Chevron pointsLeft={collapsed} />
          {collapsed ? (
            <>
              <span
                aria-hidden="true"
                className="text-[11px] font-medium tracking-wide [writing-mode:vertical-rl]"
              >
                {t('graph_detail_rail_label')}
              </span>
              {hasSelection ? (
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full bg-indigo-500 dark:bg-indigo-400"
                />
              ) : null}
            </>
          ) : null}
        </button>
      </div>
      {collapsed ? null : <div className="min-h-0 flex-1">{children}</div>}
    </aside>
  );
}
