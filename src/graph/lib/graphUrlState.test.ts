import { describe, expect, it } from 'vitest';
import { buildGraphUrl, parseGraphUrlState } from './graphUrlState';

const SHA = 'a'.repeat(40);
const BASE = 'chrome-extension://abc/src/graph/index.html';

describe('parseGraphUrlState', () => {
  it('reads a full sha and a known mode', () => {
    expect(parseGraphUrlState(`?owner=o&repo=r&sha=${SHA}&mode=network`)).toEqual({
      sha: SHA,
      mode: 'network',
    });
  });

  it('normalizes an upper-case sha', () => {
    expect(parseGraphUrlState(`?sha=${SHA.toUpperCase()}`).sha).toBe(SHA);
  });

  it.each(['', 'zzz', 'abc1234', `${SHA}0`, 'g'.repeat(40)])('rejects the sha %j', (sha) => {
    expect(parseGraphUrlState(`?sha=${sha}`).sha).toBeNull();
  });

  it('rejects an unknown mode', () => {
    expect(parseGraphUrlState('?mode=everything').mode).toBeNull();
  });

  it('returns nulls when the query has neither value', () => {
    expect(parseGraphUrlState('')).toEqual({ sha: null, mode: null });
  });
});

describe('buildGraphUrl', () => {
  it('writes owner, repo, sha and mode', () => {
    const url = new URL(
      buildGraphUrl(BASE, { owner: 'o', repo: 'r', sha: SHA, mode: 'repo-only' }),
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      owner: 'o',
      repo: 'r',
      sha: SHA,
      mode: 'repo-only',
    });
  });

  it('drops sha when nothing is selected', () => {
    const url = new URL(
      buildGraphUrl(`${BASE}?owner=o&repo=r&sha=${SHA}`, {
        owner: 'o',
        repo: 'r',
        sha: null,
        mode: 'network',
      }),
    );
    expect(url.searchParams.has('sha')).toBe(false);
  });

  it('drops sha and mode while no repository is chosen', () => {
    const url = new URL(
      buildGraphUrl(`${BASE}?sha=${SHA}&mode=network`, {
        owner: '',
        repo: '',
        sha: SHA,
        mode: 'network',
      }),
    );
    expect(url.search).toBe('');
  });

  it('keeps unrelated query parameters and the path', () => {
    const url = new URL(
      buildGraphUrl(`${BASE}?foo=1`, { owner: 'o', repo: 'r', sha: null, mode: 'network' }),
    );
    expect(url.pathname).toBe('/src/graph/index.html');
    expect(url.searchParams.get('foo')).toBe('1');
  });
});
