import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export type ContextMenuItem =
  | {
      kind: 'item';
      label: string;
      onClick: () => void;
      disabled?: boolean;
    }
  | { kind: 'separator' };

export type CommitContextMenuProps = {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
};

const VIEWPORT_MARGIN = 8;

export function CommitContextMenu({ x, y, items, onClose }: CommitContextMenuProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: x, top: y });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = x;
    let top = y;
    if (left + rect.width + VIEWPORT_MARGIN > vw) left = vw - rect.width - VIEWPORT_MARGIN;
    if (top + rect.height + VIEWPORT_MARGIN > vh) top = vh - rect.height - VIEWPORT_MARGIN;
    if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;
    if (top < VIEWPORT_MARGIN) top = VIEWPORT_MARGIN;
    setPos({ left, top });
  }, [x, y, items.length]);

  useEffect(() => {
    function handleDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    function handleScroll(e: Event) {
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return;
      onClose();
    }
    document.addEventListener('mousedown', handleDown, true);
    document.addEventListener('contextmenu', handleDown, true);
    document.addEventListener('keydown', handleKey);
    document.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', onClose);
    window.addEventListener('blur', onClose);
    return () => {
      document.removeEventListener('mousedown', handleDown, true);
      document.removeEventListener('contextmenu', handleDown, true);
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('blur', onClose);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      className="fixed z-50 min-w-[220px] overflow-hidden rounded-md border border-slate-300 bg-white/95 py-1 text-xs text-slate-900 shadow-xl ring-1 ring-black/10 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100 dark:ring-black/40"
      style={{ left: pos.left, top: pos.top }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((it, i) => {
        if (it.kind === 'separator') {
          return <div key={`sep-${i}`} className="my-1 border-t border-slate-200 dark:border-slate-800" />;
        }
        return (
          <button
            key={`item-${i}-${it.label}`}
            type="button"
            role="menuitem"
            disabled={it.disabled}
            onClick={() => {
              if (it.disabled) return;
              it.onClick();
              onClose();
            }}
            className="block w-full px-3 py-1.5 text-left text-slate-900 hover:bg-indigo-600/20 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent dark:text-slate-100 dark:hover:bg-indigo-600/40 dark:disabled:text-slate-500"
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
