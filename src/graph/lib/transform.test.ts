import { describe, expect, it } from 'vitest';
import { transformNetwork } from './transform';
import type { FetchedNetwork } from './networkApi.types';

function makeFixture(): FetchedNetwork {
  return {
    meta: {
      nethash: 'h',
      focus: 0,
      dates: [],
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

    const laneOf = (view: typeof first, sha: string) =>
      view.commits.find((c) => c.sha === sha)?.lane;
    expect([laneOf(first, 'a'), laneOf(first, 'b')]).toEqual([0, 1]);
    expect([laneOf(second, 'a'), laneOf(second, 'b'), laneOf(second, 'c')]).toEqual([0, 1, 2]);
  });
});

describe('transformNetwork - linear history', () => {
  it('produces a single lane for purely linear commits', () => {
    const linear: FetchedNetwork = {
      meta: {
        nethash: 'h',
        focus: 0,
        dates: [],
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
