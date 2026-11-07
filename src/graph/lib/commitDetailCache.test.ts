import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  forgetMissing,
  getCachedCommitDetail,
  loadCachedCommitDetail,
  storeCommitDetail,
  isKnownMissing,
  rememberMissing,
  resetCommitDetailMemoryCacheForTest,
} from './commitDetailCache';
import type { CommitDetailExtra } from './commitDetailTypes';

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

describe('persistent commit detail cache', () => {
  const detail: CommitDetailExtra = {
    additions: 1,
    deletions: 2,
    total: 3,
    truncated: false,
    files: [],
  };

  it('restores a stored detail from session storage after the memory is lost', async () => {
    await storeCommitDetail(key, detail);
    expect(getCachedCommitDetail(key)).toEqual(detail);

    resetCommitDetailMemoryCacheForTest();
    expect(getCachedCommitDetail(key)).toBeNull();
    expect(await loadCachedCommitDetail(key)).toEqual(detail);
    expect(getCachedCommitDetail(key)).toEqual(detail);
  });

  it('ignores a stored value that is not a commit detail', async () => {
    await chrome.storage.session.set({ 'commitDetail:o/r@bad': { additions: 'many' } });

    expect(await loadCachedCommitDetail({ ...key, sha: 'bad' })).toBeNull();
  });

  it('keeps working when session storage rejects', async () => {
    vi.spyOn(chrome.storage.session, 'get').mockRejectedValueOnce(new Error('boom'));
    vi.spyOn(chrome.storage.session, 'set').mockRejectedValueOnce(new Error('quota'));

    expect(await loadCachedCommitDetail({ ...key, sha: 'x' })).toBeNull();
    await expect(storeCommitDetail(key, detail)).resolves.toBeUndefined();
    expect(getCachedCommitDetail(key)).toEqual(detail);
  });
});
