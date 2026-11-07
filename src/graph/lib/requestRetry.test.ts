import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { backoffDelayMs, createCooldown, parseRetryAfterMs, sleep } from './requestRetry';

describe('backoffDelayMs', () => {
  it('doubles the wait for every further retry', () => {
    expect([1, 2, 3].map(backoffDelayMs)).toEqual([1000, 2000, 4000]);
  });
});

describe('parseRetryAfterMs', () => {
  const now = Date.parse('2026-01-01T00:00:00Z');

  it('reads a number of seconds', () => {
    expect(parseRetryAfterMs('12', now)).toBe(12_000);
  });

  it('reads an HTTP date relative to now', () => {
    expect(parseRetryAfterMs('Thu, 01 Jan 2026 00:01:00 GMT', now)).toBe(60_000);
  });

  it('treats a date in the past as no wait', () => {
    expect(parseRetryAfterMs('Wed, 31 Dec 2025 23:00:00 GMT', now)).toBe(0);
  });

  it.each([null, '', 'soon'])('ignores a missing or unreadable header (%s)', (value) => {
    expect(parseRetryAfterMs(value, now)).toBeNull();
  });
});

describe('createCooldown', () => {
  it('counts the remaining wait down with the clock', () => {
    let clock = 1000;
    const cooldown = createCooldown(() => clock);
    cooldown.extend(5000, 'rateLimit');
    clock = 3000;
    expect(cooldown.remainingMs()).toBe(3000);
    clock = 9000;
    expect(cooldown.remainingMs()).toBe(0);
  });

  it('never shortens a cooldown that is already running', () => {
    const cooldown = createCooldown(() => 0);
    cooldown.extend(8000, 'rateLimit');
    cooldown.extend(1000, 'network');
    expect(cooldown.remainingMs()).toBe(8000);
    expect(cooldown.kind()).toBe('rateLimit');
  });
});

describe('sleep', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects with the abort reason and clears its timer when aborted', async () => {
    const controller = new AbortController();
    const result = sleep(10_000, controller.signal).catch((e: unknown) => e);
    controller.abort(new Error('stop'));
    expect(await result).toEqual(new Error('stop'));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects at once when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort(new Error('stop'));
    await expect(sleep(10_000, controller.signal)).rejects.toThrow('stop');
    expect(vi.getTimerCount()).toBe(0);
  });
});
