import { describe, expect, it } from 'vitest';
import { transformNetwork } from './transform';
import type { FetchedNetwork } from './networkApi.types';

function makeFixture(): FetchedNetwork {
  return {
    meta: {
      nethash: 'h',
      focus: 0,
      dates: [],
      name: 'repo',
      users: [
        { name: 'owner', repo: 'repo', heads: [{ name: 'main', id: 'sha-merge' }] },
        { name: 'fork', repo: 'repo', heads: [{ name: 'feature', id: 'sha-fork' }] },
      ],
    },
    commits: [
      {
        id: 'sha-merge',
        author: 0,
        time: 4,
        space: 0,
        parents: [
          { sha: 'sha2', space: 0 },
          { sha: 'sha-fork', space: 1 },
        ],
        message: 'Merge feature',
      },
      {
        id: 'sha2',
        author: 0,
        time: 3,
        space: 0,
        parents: [{ sha: 'sha1', space: 0 }],
        message: 'work',
      },
      {
        id: 'sha-fork',
        author: 1,
        time: 2,
        space: 1,
        parents: [{ sha: 'sha1', space: 0 }],
        message: 'feat',
      },
      { id: 'sha1', author: 0, time: 1, space: 0, parents: [], message: 'init' },
    ],
  };
}

describe('transformNetwork - repo-only', () => {
  it('keeps commits reachable from focus heads (including merged-in fork commits)', () => {
    const view = transformNetwork(makeFixture(), {
      mode: 'repo-only',
      inputOwner: 'owner',
      inputRepo: 'repo',
    });
    expect(view.commits.map((c) => c.sha)).toEqual(['sha-merge', 'sha2', 'sha-fork', 'sha1']);
  });

  it('preserves lane separation between fork-derived and main-line commits', () => {
    const view = transformNetwork(makeFixture(), {
      mode: 'repo-only',
      inputOwner: 'owner',
      inputRepo: 'repo',
    });
    expect(view.laneCount).toBe(2);
    const fork = view.commits.find((c) => c.sha === 'sha-fork')!;
    expect(fork.lane).toBe(1);
  });

  it('keeps direct parents of merge commits', () => {
    const view = transformNetwork(makeFixture(), {
      mode: 'repo-only',
      inputOwner: 'owner',
      inputRepo: 'repo',
    });
    const merge = view.commits.find((c) => c.sha === 'sha-merge')!;
    expect(merge.parents).toEqual(['sha2', 'sha-fork']);
  });

  it('exposes focus owner/repo and focus heads only', () => {
    const view = transformNetwork(makeFixture(), {
      mode: 'repo-only',
      inputOwner: 'owner',
      inputRepo: 'repo',
    });
    expect(view.focusOwner).toBe('owner');
    expect(view.focusRepo).toBe('repo');
    expect(view.focusHeads.map((h) => h.name)).toEqual(['main']);
  });

  it('falls back to author-index when focus heads are missing or unreachable', () => {
    const fixture = makeFixture();
    fixture.meta.users[0].heads = [];
    const view = transformNetwork(fixture, {
      mode: 'repo-only',
      inputOwner: 'owner',
      inputRepo: 'repo',
    });
    expect(view.commits.map((c) => c.sha)).toEqual(['sha-merge', 'sha2', 'sha1']);
  });

  it('uses inputOwner/inputRepo to locate focus user even when meta.focus is invalid', () => {
    const fixture = makeFixture();
    fixture.meta.focus = 9999;
    const view = transformNetwork(fixture, {
      mode: 'repo-only',
      inputOwner: 'owner',
      inputRepo: 'repo',
    });
    expect(view.focusOwner).toBe('owner');
    expect(view.commits.length).toBeGreaterThan(0);
  });
});

describe('transformNetwork - network mode', () => {
  it('keeps every commit', () => {
    const view = transformNetwork(makeFixture(), {
      mode: 'network',
      inputOwner: 'owner',
      inputRepo: 'repo',
    });
    expect(view.commits).toHaveLength(4);
  });

  it('uses GitHub space directly as lane, so distinct fork lane is preserved', () => {
    const view = transformNetwork(makeFixture(), {
      mode: 'network',
      inputOwner: 'owner',
      inputRepo: 'repo',
    });
    const fork = view.commits.find((c) => c.sha === 'sha-fork')!;
    expect(fork.lane).toBe(1);
    expect(view.laneCount).toBe(2);
  });

  it('produces a merge edge from sha-merge to sha-fork (different lane)', () => {
    const view = transformNetwork(makeFixture(), {
      mode: 'network',
      inputOwner: 'owner',
      inputRepo: 'repo',
    });
    const toForkEdge = view.edges.find((e) => e.fromSha === 'sha-merge' && e.toSha === 'sha-fork');
    expect(toForkEdge).toBeDefined();
    expect(toForkEdge!.isMerge).toBe(true);
    expect(toForkEdge!.fromLane).toBe(0);
    expect(toForkEdge!.toLane).toBe(1);
  });
});

describe('transformNetwork - lane order', () => {
  const meta = {
    nethash: 'h',
    focus: 0,
    dates: [],
    name: 'r',
    users: [{ name: 'o', repo: 'r', heads: [] }],
  };
  const newer = [
    { id: 'a', author: 0, time: 4, space: 7, parents: [{ sha: 'b', space: 7 }], message: 'a' },
    { id: 'b', author: 0, time: 3, space: 2, parents: [], message: 'b' },
  ];
  const older = [{ id: 'c', author: 0, time: 1, space: 0, parents: [], message: 'c' }];

  it('numbers lanes by first appearance so loading older commits never renumbers a lane', () => {
    const first = transformNetwork({ meta, commits: newer }, { mode: 'network' });
    const second = transformNetwork({ meta, commits: [...newer, ...older] }, { mode: 'network' });

    expect([...first.spaceToLane]).toEqual([
      [7, 0],
      [2, 1],
    ]);
    expect(second.spaceToLane.get(7)).toBe(0);
    expect(second.spaceToLane.get(2)).toBe(1);
    expect(second.spaceToLane.get(0)).toBe(2);
  });
});

describe('transformNetwork - previousSpaceToLane', () => {
  it('preserves existing lane numbers for spaces already seen', () => {
    const view1 = transformNetwork(makeFixture(), {
      mode: 'network',
      inputOwner: 'owner',
      inputRepo: 'repo',
    });
    expect(view1.spaceToLane.get(0)).toBe(0);
    expect(view1.spaceToLane.get(1)).toBe(1);

    const view2 = transformNetwork(makeFixture(), {
      mode: 'network',
      inputOwner: 'owner',
      inputRepo: 'repo',
      previousSpaceToLane: view1.spaceToLane,
    });
    expect(view2.spaceToLane.get(0)).toBe(0);
    expect(view2.spaceToLane.get(1)).toBe(1);
    expect(view2.laneCount).toBe(2);
  });

  it('assigns new space values to lanes after the previously used max lane', () => {
    const prev = new Map<number, number>([
      [5, 0],
      [1, 1],
    ]);
    const fixture: FetchedNetwork = {
      meta: {
        nethash: 'h',
        focus: 0,
        dates: [],
        name: 'r',
        users: [{ name: 'o', repo: 'r', heads: [{ name: 'main', id: 'a' }] }],
      },
      commits: [
        { id: 'a', author: 0, time: 4, space: 5, parents: [], message: 'a' },
        { id: 'b', author: 0, time: 3, space: 1, parents: [], message: 'b' },
        { id: 'c', author: 0, time: 2, space: 0, parents: [], message: 'c' },
        { id: 'd', author: 0, time: 1, space: 3, parents: [], message: 'd' },
      ],
    };
    const view = transformNetwork(fixture, {
      mode: 'network',
      previousSpaceToLane: prev,
    });
    expect(view.spaceToLane.get(5)).toBe(0);
    expect(view.spaceToLane.get(1)).toBe(1);
    expect(view.spaceToLane.get(0)).toBe(2);
    expect(view.spaceToLane.get(3)).toBe(3);
    expect(view.laneCount).toBe(4);
  });

  it('drops previous spaces that are no longer present (no orphan lane reservation)', () => {
    const prev = new Map<number, number>([[99, 0]]);
    const fixture: FetchedNetwork = {
      meta: {
        nethash: 'h',
        focus: 0,
        dates: [],
        name: 'r',
        users: [{ name: 'o', repo: 'r', heads: [{ name: 'main', id: 'a' }] }],
      },
      commits: [{ id: 'a', author: 0, time: 1, space: 0, parents: [], message: 'a' }],
    };
    const view = transformNetwork(fixture, {
      mode: 'network',
      previousSpaceToLane: prev,
    });
    expect(view.spaceToLane.has(99)).toBe(false);
    expect(view.spaceToLane.get(0)).toBe(0);
    expect(view.laneCount).toBe(1);
  });
});

describe('transformNetwork - linear history', () => {
  it('produces a single lane for purely linear commits', () => {
    const linear: FetchedNetwork = {
      meta: {
        nethash: 'h',
        focus: 0,
        dates: [],
        name: 'r',
        users: [{ name: 'o', repo: 'r', heads: [{ name: 'main', id: 'c' }] }],
      },
      commits: [
        { id: 'c', author: 0, time: 3, space: 0, parents: [{ sha: 'b', space: 0 }], message: 'c' },
        { id: 'b', author: 0, time: 2, space: 0, parents: [{ sha: 'a', space: 0 }], message: 'b' },
        { id: 'a', author: 0, time: 1, space: 0, parents: [], message: 'a' },
      ],
    };
    const view = transformNetwork(linear, { mode: 'repo-only' });
    expect(view.laneCount).toBe(1);
    expect(view.edges).toHaveLength(2);
    expect(view.edges.every((e) => !e.isMerge)).toBe(true);
  });
});

describe('transformNetwork - fork branches', () => {
  it('lists fork branches grouped by owner in network mode', () => {
    const data = makeFixture();
    data.meta.users.push({
      name: 'alpha',
      repo: 'repo',
      heads: [
        { name: 'z-branch', id: 'sha-fork' },
        { name: 'a-branch', id: 'sha-fork' },
      ],
    });
    const view = transformNetwork(data, {
      mode: 'network',
      inputOwner: 'owner',
      inputRepo: 'repo',
    });

    expect(view.forkBranches).toEqual([
      {
        owner: 'alpha',
        branches: [
          { name: 'a-branch', sha: 'sha-fork' },
          { name: 'z-branch', sha: 'sha-fork' },
        ],
      },
      { owner: 'fork', branches: [{ name: 'feature', sha: 'sha-fork' }] },
    ]);
  });

  it('omits fork branches in repo-only mode', () => {
    const view = transformNetwork(makeFixture(), {
      mode: 'repo-only',
      inputOwner: 'owner',
      inputRepo: 'repo',
    });

    expect(view.forkBranches).toEqual([]);
  });
});
