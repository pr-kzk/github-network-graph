import type { FetchedNetwork, NetworkRawCommit } from '@/graph/lib/networkApi.types';

function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeSyntheticNetwork(count: number, seed = 1): FetchedNetwork {
  const random = makeRandom(seed);
  const commits: NetworkRawCommit[] = [];
  const spaces = 12;
  for (let i = 0; i < count; i++) {
    const parents: NetworkRawCommit['parents'] = [];
    const first = i + 1 + Math.floor(random() * 3);
    if (first < count) parents.push({ sha: `c${first}`, space: first % spaces });
    if (random() < 0.12) {
      const second = i + 2 + Math.floor(random() * 40);
      if (second < count && second !== first)
        parents.push({ sha: `c${second}`, space: second % spaces });
    }
    if (random() < 0.01) parents.push({ sha: 'missing-' + i, space: 0 });
    commits.push({
      id: `c${i}`,
      author: i % 3,
      time: count - i,
      space: i % spaces,
      parents,
      message: `commit ${i}\nbody`,
    });
  }
  const head = (name: string, id: string) => ({ name, id });
  return {
    meta: {
      nethash: 'h',
      focus: 0,
      dates: [],
      users: [
        {
          name: 'owner',
          repo: 'repo',
          heads: [head('main', 'c0'), head('dev', `c${Math.floor(count / 2)}`)],
        },
        { name: 'fork', repo: 'repo', heads: [head('feature', 'c1')] },
        { name: 'other', repo: 'repo', heads: [] },
      ],
    },
    commits,
  };
}
