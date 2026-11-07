import { describe, expect, it } from 'vitest';
import { navigationTarget, type NavigationContext } from './commitNavigation';
import type { ViewCommit } from './transform.types';

function commit(sha: string, row: number, parents: string[] = []): ViewCommit {
  return {
    sha,
    shortSha: sha,
    row,
    lane: 0,
    time: 0,
    dateLabel: '',
    authorName: '',
    authorLogin: '',
    authorRepo: '',
    message: '',
    subject: '',
    parents,
    refs: [],
  };
}

const COMMITS = [commit('c', 0, ['b']), commit('b', 1, ['a']), commit('a', 2)];

function context(selectedSha: string | null): NavigationContext {
  return {
    commits: COMMITS,
    selectedSha,
    commitBySha: new Map(COMMITS.map((c) => [c.sha, c])),
    childrenBySha: new Map([
      ['b', ['c']],
      ['a', ['b']],
    ]),
  };
}

describe('navigationTarget', () => {
  it.each(['j', 'ArrowDown'])('%s selects the next older commit', (key) => {
    expect(navigationTarget(key, context('c'))).toBe('b');
  });

  it.each(['k', 'ArrowUp'])('%s selects the next newer commit', (key) => {
    expect(navigationTarget(key, context('a'))).toBe('b');
  });

  it('does not move past the oldest loaded commit', () => {
    expect(navigationTarget('j', context('a'))).toBeNull();
  });

  it('does not move past the newest loaded commit', () => {
    expect(navigationTarget('k', context('c'))).toBeNull();
  });

  it('starts from the newest commit when nothing is selected', () => {
    expect(navigationTarget('j', context(null))).toBe('c');
    expect(navigationTarget('k', context(null))).toBe('c');
  });

  it('starts from the newest commit when the selection is not loaded yet', () => {
    expect(navigationTarget('j', context('unloaded'))).toBe('c');
  });

  it.each(['g', 'Home'])('%s jumps to the newest loaded commit', (key) => {
    expect(navigationTarget(key, context('a'))).toBe('c');
  });

  it.each(['G', 'End'])('%s jumps to the oldest loaded commit', (key) => {
    expect(navigationTarget(key, context('c'))).toBe('a');
  });

  it('[ jumps to the first parent even when it is not loaded', () => {
    const ctx = context('c');
    expect(navigationTarget('[', ctx)).toBe('b');
  });

  it('[ does nothing on a root commit', () => {
    expect(navigationTarget('[', context('a'))).toBeNull();
  });

  it('] jumps to the first child', () => {
    expect(navigationTarget(']', context('a'))).toBe('b');
  });

  it('] does nothing on a commit without loaded children', () => {
    expect(navigationTarget(']', context('c'))).toBeNull();
  });

  it('[ and ] do nothing without a selection', () => {
    expect(navigationTarget('[', context(null))).toBeNull();
    expect(navigationTarget(']', context(null))).toBeNull();
  });

  it('ignores unrelated keys', () => {
    expect(navigationTarget('x', context('b'))).toBeNull();
  });

  it('returns null for an empty commit list', () => {
    expect(
      navigationTarget('j', { ...context(null), commits: [], commitBySha: new Map() }),
    ).toBeNull();
  });
});
