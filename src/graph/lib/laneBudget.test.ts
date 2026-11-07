import { describe, expect, it } from 'vitest';
import { chooseVisibleLanes, collectPath, edgeEmphasis, priorityLanes } from './laneBudget';
import type { ViewCommit, ViewRef } from './transform.types';
import { makeCommit } from '../../../test/factories';

function commit(
  sha: string,
  lane: number,
  parents: string[] = [],
  refs: ViewRef[] = [],
): ViewCommit {
  return makeCommit(sha, { lane, parents, refs });
}

const focusRef: ViewRef = { name: 'main', isFocus: true, ownerName: 'o' };
const forkRef: ViewRef = { name: 'main', isFocus: false, ownerName: 'fork' };

describe('priorityLanes', () => {
  it('starts with the lane of the newest commit and adds lanes carrying a focus branch', () => {
    const commits = [
      commit('a', 4),
      commit('b', 9, [], [focusRef]),
      commit('c', 7, [], [forkRef]),
      commit('d', 9, [], [focusRef]),
      commit('e', 2, [], [focusRef]),
    ];
    expect(priorityLanes(commits)).toEqual([4, 9, 2]);
  });

  it('is empty without commits', () => {
    expect(priorityLanes([])).toEqual([]);
  });
});

describe('chooseVisibleLanes', () => {
  it('shows every lane while they fit', () => {
    expect(chooseVisibleLanes(3, 5, [2])).toEqual([0, 1, 2]);
  });

  it('keeps priority lanes first and fills the rest in lane order', () => {
    expect(chooseVisibleLanes(100, 5, [50, 70])).toEqual([0, 1, 2, 50, 70]);
  });

  it('never exceeds the budget even when there are more priority lanes than slots', () => {
    expect(chooseVisibleLanes(100, 3, [90, 80, 70, 60])).toEqual([70, 80, 90]);
  });

  it('ignores duplicate and out-of-range priority lanes', () => {
    expect(chooseVisibleLanes(10, 4, [7, 7, -1, 99])).toEqual([0, 1, 2, 7]);
  });

  it('keeps already visible lanes in place when later lanes are appended', () => {
    expect(chooseVisibleLanes(90, 10, [0, 5])).toEqual(chooseVisibleLanes(60, 10, [0, 5]));
  });
});

describe('edgeEmphasis', () => {
  const base = { crowded: true, hasSelection: false, onPath: false, priority: false };

  it('draws everything the same when the lanes fit', () => {
    expect(edgeEmphasis({ ...base, crowded: false, hasSelection: true })).toEqual({
      opacity: 1,
      width: 2,
    });
  });

  it('mutes lanes that are not focus branches', () => {
    const muted = edgeEmphasis(base);
    const focus = edgeEmphasis({ ...base, priority: true });
    expect(muted.opacity).toBeLessThan(focus.opacity);
    expect(muted.width).toBeLessThan(focus.width);
  });

  it('highlights the selected path in full and fades everything else', () => {
    const onPath = edgeEmphasis({ ...base, hasSelection: true, onPath: true });
    const other = edgeEmphasis({ ...base, hasSelection: true, priority: true });
    expect(onPath.opacity).toBe(1);
    expect(other.opacity).toBeLessThan(0.5);
    expect(onPath.width).toBeGreaterThan(other.width);
  });
});

describe('collectPath', () => {
  const commits = [
    commit('top', 0, ['mid']),
    commit('side', 1, ['mid']),
    commit('mid', 0, ['base']),
    commit('base', 0, []),
    commit('unrelated', 2, []),
  ];
  const commitBySha = new Map(commits.map((c) => [c.sha, c]));
  const childrenBySha = new Map([
    ['mid', ['top', 'side']],
    ['base', ['mid']],
  ]);

  it('contains the commit, all its ancestors and all its descendants', () => {
    expect(collectPath('mid', commitBySha, childrenBySha)).toEqual(
      new Set(['mid', 'base', 'top', 'side']),
    );
  });

  it('leaves out commits on other lines of history', () => {
    const path = collectPath('top', commitBySha, childrenBySha);
    expect(path.has('side')).toBe(false);
    expect(path.has('unrelated')).toBe(false);
  });
});
