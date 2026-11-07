import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { RetryNotice } from '../lib/networkApi.types';
import { useRetryMessage } from './useRetryMessage';

const START = Date.parse('2026-01-01T00:00:00Z');

const notice = (overrides: Partial<RetryNotice> = {}): RetryNotice => ({
  kind: 'rateLimit',
  attempt: 2,
  maxAttempts: 3,
  resumeAt: START + 8000,
  ...overrides,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useRetryMessage', () => {
  it('says nothing when there is no retry', () => {
    const { result } = renderHook(() => useRetryMessage(null));
    expect(result.current).toBeNull();
  });

  it('counts down the seconds until the retry with the attempt number', () => {
    const { result } = renderHook(() => useRetryMessage(notice()));
    expect(result.current).toBe('GitHub is limiting requests. Retrying in 8 s (attempt 2 of 3)…');

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current).toBe('GitHub is limiting requests. Retrying in 5 s (attempt 2 of 3)…');
  });

  it.each([
    ['network', 'Connection problem. Retrying in 8 s (attempt 2 of 3)…'],
    ['server', 'GitHub had a problem. Retrying in 8 s (attempt 2 of 3)…'],
  ] as const)('explains a %s problem in its own words', (kind, expected) => {
    const { result } = renderHook(() => useRetryMessage(notice({ kind })));
    expect(result.current).toBe(expected);
  });

  it('says requests are paused when waiting for another request cooldown', () => {
    const { result } = renderHook(() => useRetryMessage(notice({ attempt: 0 })));
    expect(result.current).toBe('Pausing requests to GitHub for 8 s to let it recover…');
  });

  it('falls silent once the wait is over', () => {
    const { result } = renderHook(() => useRetryMessage(notice()));
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(result.current).toBeNull();
  });
});
