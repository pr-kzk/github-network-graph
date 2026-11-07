import type { Virtualizer } from '@tanstack/react-virtual';
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRevealSelectedRow } from './useRevealSelectedRow';

function reveal() {
  const scrollToIndex = vi.fn<Virtualizer<HTMLDivElement, Element>['scrollToIndex']>();
  const virtualizer = { getVirtualItems: () => [], scrollToIndex };
  renderHook(() => useRevealSelectedRow(virtualizer, { current: null }, 3));
  return scrollToIndex;
}

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn<(query: string) => { matches: boolean }>(() => ({ matches })),
  );
}

describe('useRevealSelectedRow', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('scrolls smoothly to an off-screen selection by default', () => {
    mockReducedMotion(false);
    expect(reveal()).toHaveBeenCalledWith(3, expect.objectContaining({ behavior: 'smooth' }));
  });

  it('jumps without animation when the user prefers reduced motion', () => {
    mockReducedMotion(true);
    expect(reveal()).toHaveBeenCalledWith(3, expect.objectContaining({ behavior: 'auto' }));
  });
});
