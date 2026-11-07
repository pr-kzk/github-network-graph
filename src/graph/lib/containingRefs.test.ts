import { describe, expect, it } from 'vitest';
import { findContainingRefs } from './containingRefs';
import type { ViewCommit, ViewRef } from './transform.types';

function commit(sha: string, parents: string[], refs: ViewRef[] = []): ViewCommit {
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
    isFocus: true,
    message: '',
    subject: '',
    parents,
    refs,
  };
}

const main: ViewRef = { name: 'main', isFocus: true, ownerName: 'o' };
const feature: ViewRef = { name: 'feature', isFocus: false, ownerName: 'fork' };

function index(commits: ViewCommit[]) {
  const commitBySha = new Map(commits.map((c) => [c.sha, c]));
  const childrenBySha = new Map<string, string[]>();
  for (const c of commits) {
    for (const p of c.parents) childrenBySha.set(p, [...(childrenBySha.get(p) ?? []), c.sha]);
  }
  return { commitBySha, childrenBySha };
}

describe('findContainingRefs', () => {
  const { commitBySha, childrenBySha } = index([
    commit('tip', ['mid'], [main]),
    commit('side', ['base'], [feature]),
    commit('mid', ['base']),
    commit('base', []),
  ]);

  it('lists every branch tip reachable from the commit through descendants', () => {
    expect(findContainingRefs('base', commitBySha, childrenBySha)).toEqual([
      { name: 'main', ownerName: 'o', isFocus: true, sha: 'tip' },
      { name: 'feature', ownerName: 'fork', isFocus: false, sha: 'side' },
    ]);
  });

  it('excludes branches that diverged before the commit', () => {
    expect(findContainingRefs('mid', commitBySha, childrenBySha).map((r) => r.name)).toEqual([
      'main',
    ]);
  });

  it('includes a ref sitting on the commit itself', () => {
    expect(findContainingRefs('tip', commitBySha, childrenBySha).map((r) => r.name)).toEqual([
      'main',
    ]);
  });

  it('returns nothing for a commit no branch contains among loaded commits', () => {
    expect(findContainingRefs('missing', commitBySha, childrenBySha)).toEqual([]);
  });
});
