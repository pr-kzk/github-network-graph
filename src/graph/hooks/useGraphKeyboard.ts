import { useEffect, useRef } from 'react';
import { NAVIGATION_KEYS, navigationTarget, type NavigationContext } from '../lib/commitNavigation';
import { COMMIT_DETAIL_SELECTOR, COMMIT_LIST_SELECTOR } from '../lib/domTargets';

const SELF_HANDLED =
  'input, textarea, select, [contenteditable="true"], [role="menu"], [role="dialog"], dialog';
const SCROLL_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End']);

type UseGraphKeyboardArgs = NavigationContext & {
  onSelect: (sha: string) => void;
  onFocusDetail: () => void;
  onFocusSearch: () => void;
  onShowShortcuts: () => void;
};

function isOwnedBy(target: Element | null, selector: string): boolean {
  return target?.closest(selector) != null;
}

export function useGraphKeyboard(args: UseGraphKeyboardArgs): void {
  const latest = useRef(args);
  useEffect(() => {
    latest.current = args;
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (isOwnedBy(target, SELF_HANDLED)) return;
      const ctx = latest.current;
      const inDetail = isOwnedBy(target, COMMIT_DETAIL_SELECTOR);

      if (event.key === '?') {
        event.preventDefault();
        ctx.onShowShortcuts();
        return;
      }
      if (event.key === '/') {
        event.preventDefault();
        ctx.onFocusSearch();
        return;
      }
      if (event.key === 'Escape') {
        if (!inDetail) return;
        event.preventDefault();
        document.querySelector<HTMLElement>(`${COMMIT_LIST_SELECTOR} [tabindex="0"]`)?.focus();
        return;
      }
      if (event.key === 'Enter') {
        const onPlainSurface = target === null || target === document.body;
        if (!onPlainSurface && !isOwnedBy(target, COMMIT_LIST_SELECTOR)) return;
        event.preventDefault();
        if (ctx.selectedSha) {
          ctx.onFocusDetail();
        } else if (ctx.commits[0]) {
          ctx.onSelect(ctx.commits[0].sha);
        }
        return;
      }
      if (!NAVIGATION_KEYS.has(event.key)) return;
      if (inDetail && SCROLL_KEYS.has(event.key)) return;
      event.preventDefault();
      const sha = navigationTarget(event.key, ctx);
      if (!sha || sha === ctx.selectedSha) return;
      if (inDetail && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      ctx.onSelect(sha);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}
