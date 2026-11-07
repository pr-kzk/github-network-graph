import { useEffect, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { PANEL_SURFACE_TRANSLUCENT } from '@/shared/ui';
import { clampToViewport, useAnchoredPosition } from '../hooks/useAnchoredPosition';
import { useDismissOnOutsidePress } from '../hooks/useDismissOnOutsidePress';
import { useKeyPress } from '../hooks/useKeyPress';
import { useInitialFocus } from '../hooks/useInitialFocus';

export type ContextMenuItem =
  | {
      kind: 'item';
      id: string;
      label: string;
      onClick: () => void;
      disabled?: boolean;
    }
  | { kind: 'separator'; id: string };

type CommitContextMenuProps = {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
};

function enabledItems(menu: HTMLElement | null): HTMLButtonElement[] {
  return menu
    ? [...menu.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]:enabled')]
    : [];
}

export function CommitContextMenu({ x, y, items, onClose }: CommitContextMenuProps) {
  const { ref, position } = useAnchoredPosition<HTMLDivElement>(x, y, clampToViewport);

  useInitialFocus(() => enabledItems(ref.current)[0]);
  useDismissOnOutsidePress(ref, onClose);
  useKeyPress('Escape', onClose);

  function handleKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Tab') {
      e.preventDefault();
      onClose();
      return;
    }
    const buttons = enabledItems(ref.current);
    if (buttons.length === 0) return;
    const active = document.activeElement;
    const current = active instanceof HTMLButtonElement ? buttons.indexOf(active) : -1;
    let next: number;
    if (e.key === 'ArrowDown') next = (current + 1) % buttons.length;
    else if (e.key === 'ArrowUp') next = (current - 1 + buttons.length) % buttons.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = buttons.length - 1;
    else return;
    e.preventDefault();
    buttons[next].focus();
  }

  useEffect(() => {
    function handleScroll(e: Event) {
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return;
      onClose();
    }
    document.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', onClose);
    window.addEventListener('blur', onClose);
    return () => {
      document.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('blur', onClose);
    };
  }, [ref, onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      tabIndex={-1}
      className={`fixed z-50 min-w-[220px] overflow-hidden py-1 text-xs backdrop-blur ${PANEL_SURFACE_TRANSLUCENT}`}
      style={{ left: position.left, top: position.top }}
      onKeyDown={handleKeyDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((it) => {
        if (it.kind === 'separator') {
          return (
            <div key={it.id} className="my-1 border-t border-slate-200 dark:border-slate-800" />
          );
        }
        return (
          <button
            key={it.id}
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
