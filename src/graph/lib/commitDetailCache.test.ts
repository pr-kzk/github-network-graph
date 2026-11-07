import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  forgetMissing,
  isKnownMissing,
  rememberMissing,
  resetCommitDetailMemoryCacheForTest,
} from './commitDetailCache';

const key = { owner: 'o', repo: 'r', sha: 'abc' };

beforeEach(() => {
  vi.useFakeTimers();
  resetCommitDetailMemoryCacheForTest();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('missing-commit memory', () => {
  it('treats a commit as missing until the memory expires, then forgets it', () => {
    rememberMissing(key);
    expect(isKnownMissing(key)).toBe(true);

    vi.advanceTimersByTime(4 * 60_000);
    expect(isKnownMissing(key)).toBe(true);

    vi.advanceTimersByTime(2 * 60_000);
    expect(isKnownMissing(key)).toBe(false);
  });

  it('remembers each commit separately and lets one be forgotten', () => {
    rememberMissing(key);
    rememberMissing({ ...key, sha: 'def' });
    forgetMissing(key);

    expect(isKnownMissing(key)).toBe(false);
    expect(isKnownMissing({ ...key, sha: 'def' })).toBe(true);
    expect(isKnownMissing({ ...key, repo: 'other' })).toBe(false);
  });
});
