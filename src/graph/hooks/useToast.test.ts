import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useToast } from './useToast';

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a message and dismisses it automatically', () => {
    const { result } = renderHook(() => useToast());
    act(() => result.current.showToast('success', 'Copied'));
    expect(result.current.toast).toMatchObject({ kind: 'success', message: 'Copied' });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.toast).toBeNull();
  });

  it('keeps error messages visible longer than success messages', () => {
    const { result } = renderHook(() => useToast());
    act(() => result.current.showToast('error', 'Copy failed'));
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.toast).toMatchObject({ message: 'Copy failed' });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.toast).toBeNull();
  });

  it('replaces the current message instead of stacking, even when repeated, and restarts the dismiss timer', () => {
    const { result } = renderHook(() => useToast());
    act(() => result.current.showToast('success', 'first'));
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    const firstId = result.current.toast?.id;
    act(() => result.current.showToast('success', 'second'));
    expect(result.current.toast?.id).not.toBe(firstId);
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.toast).toMatchObject({ message: 'second' });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.toast).toBeNull();
  });
});
