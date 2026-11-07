import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useJumpFeedback } from './useJumpFeedback';

type Props = { seeking: boolean; selectedSha: string | null; isLoaded: boolean };

describe('useJumpFeedback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(initial: Props) {
    const onJumped = vi.fn<(sha: string) => void>();
    const hook = renderHook((props: Props) => useJumpFeedback({ ...props, onJumped }), {
      initialProps: initial,
    });
    return { onJumped, ...hook };
  }

  it('reports the jump and flashes the commit once a search has reached it', () => {
    const { result, rerender, onJumped } = setup({
      seeking: true,
      selectedSha: 'x',
      isLoaded: false,
    });
    expect(result.current).toBeNull();

    rerender({ seeking: false, selectedSha: 'x', isLoaded: true });

    expect(result.current).toBe('x');
    expect(onJumped).toHaveBeenCalledWith('x');
  });

  it('stops flashing after a moment', () => {
    const { result, rerender } = setup({ seeking: true, selectedSha: 'x', isLoaded: false });
    rerender({ seeking: false, selectedSha: 'x', isLoaded: true });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current).toBeNull();
  });

  it('stays quiet when the selection was cleared during the search', () => {
    const { result, rerender, onJumped } = setup({
      seeking: true,
      selectedSha: 'x',
      isLoaded: false,
    });
    rerender({ seeking: false, selectedSha: null, isLoaded: false });
    expect(result.current).toBeNull();
    expect(onJumped).not.toHaveBeenCalled();
  });

  it('stays quiet for a selection that never needed a search', () => {
    const { result, rerender, onJumped } = setup({
      seeking: false,
      selectedSha: 'x',
      isLoaded: true,
    });
    rerender({ seeking: false, selectedSha: 'y', isLoaded: true });
    expect(result.current).toBeNull();
    expect(onJumped).not.toHaveBeenCalled();
  });
});
