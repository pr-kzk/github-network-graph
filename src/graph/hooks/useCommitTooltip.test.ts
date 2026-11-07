import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCommitTooltip } from './useCommitTooltip';
import type { ViewCommit } from '../lib/transform.types';

function commit(sha: string): ViewCommit {
  return {
    sha,
    shortSha: sha,
    row: 0,
    lane: 0,
    time: 0,
    dateLabel: '',
    authorName: '',
    authorLogin: '',
    authorRepo: '',
    message: '',
    subject: '',
    parents: [],
    refs: [],
  };
}

const BY_SHA = new Map([
  ['a', commit('a')],
  ['b', commit('b')],
]);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useCommitTooltip', () => {
  it('waits for the pointer to rest before showing a tooltip', () => {
    const { result } = renderHook(() => useCommitTooltip(BY_SHA, false));
    act(() => result.current.onHover('a', 10, 20));
    expect(result.current.commit).toBeNull();
    act(() => void vi.advanceTimersByTime(400));
    expect(result.current.commit?.sha).toBe('a');
    expect(result.current.pointer.getSnapshot()).toEqual({ x: 10, y: 20 });
  });

  it('does not re-render its host while the pointer moves within the same commit', () => {
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useCommitTooltip(BY_SHA, false);
    });
    act(() => result.current.onHover('a', 10, 20));
    act(() => void vi.advanceTimersByTime(400));
    act(() => result.current.onHover('a', 11, 21));
    const settled = renders;

    for (let i = 0; i < 20; i++) act(() => result.current.onHover('a', 12 + i, 22 + i));

    expect(renders).toBe(settled);
  });

  it('moves the tooltip with the pointer and tells subscribers', () => {
    const { result } = renderHook(() => useCommitTooltip(BY_SHA, false));
    const listener = vi.fn<() => void>();
    result.current.pointer.subscribe(listener);
    act(() => result.current.onHover('a', 10, 20));
    act(() => void vi.advanceTimersByTime(400));
    listener.mockClear();

    act(() => result.current.onHover('a', 50, 60));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(result.current.pointer.getSnapshot()).toEqual({ x: 50, y: 60 });
  });

  it('does not show a tooltip when the pointer leaves before the delay', () => {
    const { result } = renderHook(() => useCommitTooltip(BY_SHA, false));
    act(() => result.current.onHover('a', 10, 20));
    act(() => result.current.onLeave());
    act(() => void vi.advanceTimersByTime(1000));
    expect(result.current.commit).toBeNull();
  });

  it('follows the pointer to another commit without waiting again', () => {
    const { result } = renderHook(() => useCommitTooltip(BY_SHA, false));
    act(() => result.current.onHover('a', 10, 20));
    act(() => void vi.advanceTimersByTime(400));
    act(() => result.current.onHover('b', 30, 40));
    expect(result.current.commit?.sha).toBe('b');
  });

  it('keeps a hover tooltip until the pointer leaves', () => {
    const { result } = renderHook(() => useCommitTooltip(BY_SHA, false));
    act(() => result.current.onHover('a', 10, 20));
    act(() => void vi.advanceTimersByTime(10_000));
    expect(result.current.commit?.sha).toBe('a');
    act(() => result.current.onLeave());
    expect(result.current.commit).toBeNull();
  });

  it('hides a keyboard-focus tooltip by itself after a few seconds', () => {
    const { result } = renderHook(() => useCommitTooltip(BY_SHA, false));
    act(() => result.current.onFocus('a', 10, 20));
    act(() => void vi.advanceTimersByTime(400));
    expect(result.current.commit?.sha).toBe('a');
    act(() => void vi.advanceTimersByTime(3500));
    expect(result.current.commit).toBeNull();
  });

  it('hides the tooltip while it is suppressed', () => {
    const { result, rerender } = renderHook(
      ({ suppressed }) => useCommitTooltip(BY_SHA, suppressed),
      { initialProps: { suppressed: false } },
    );
    act(() => result.current.onHover('a', 10, 20));
    act(() => void vi.advanceTimersByTime(400));
    rerender({ suppressed: true });
    expect(result.current.commit).toBeNull();
  });

  it('shows nothing for a commit that is not loaded', () => {
    const { result } = renderHook(() => useCommitTooltip(BY_SHA, false));
    act(() => result.current.onHover('missing', 0, 0));
    act(() => void vi.advanceTimersByTime(400));
    expect(result.current.commit).toBeNull();
  });
});
