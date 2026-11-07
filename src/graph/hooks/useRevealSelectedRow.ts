import type { VirtualItem, Virtualizer } from '@tanstack/react-virtual';
import { useEffect, type RefObject } from 'react';
import { ROW_HEIGHT } from '../lib/graphMetrics';

type RowScroller = Pick<Virtualizer<HTMLDivElement, Element>, 'scrollToIndex'> & {
  getVirtualItems: () => readonly VirtualItem[];
};

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function useRevealSelectedRow(
  virtualizer: RowScroller,
  scrollRef: RefObject<HTMLDivElement | null>,
  selectedRow: number | null,
) {
  useEffect(() => {
    if (selectedRow === null) return;
    const container = scrollRef.current;
    const visible = virtualizer.getVirtualItems().find((vi) => vi.index === selectedRow);
    if (visible && container) {
      const top = container.scrollTop + ROW_HEIGHT;
      const bottom = container.scrollTop + container.clientHeight - ROW_HEIGHT;
      if (visible.start >= top && visible.start + visible.size <= bottom) return;
    }
    virtualizer.scrollToIndex(selectedRow, {
      align: 'center',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }, [selectedRow, virtualizer, scrollRef]);
}
