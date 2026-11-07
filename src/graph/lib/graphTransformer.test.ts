import { describe, expect, it } from 'vitest';
import { makeSyntheticNetwork } from '../../../test/syntheticNetwork';
import { createGraphTransformer } from './graphTransformer';
import type { FetchedNetwork } from './networkApi.types';
import { transformNetwork } from './transform';

const OPTIONS = { mode: 'network', inputOwner: 'owner', inputRepo: 'repo' } as const;

function growingPages(full: FetchedNetwork, sizes: number[]): FetchedNetwork[] {
  let end = 0;
  return sizes.map((size) => {
    end = Math.min(full.commits.length, end + size);
    return { meta: full.meta, commits: full.commits.slice(0, end) };
  });
}

function randomSizes(seed: number, total: number): number[] {
  const sizes: number[] = [];
  let state = seed;
  for (let sum = 0; sum < total;) {
    state = (state * 1103515245 + 12345) % 2147483648;
    const size = 1 + (state % 120);
    sizes.push(size);
    sum += size;
  }
  return sizes;
}

describe('createGraphTransformer', () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8])(
    'matches a from-scratch transform after random page splits (seed %i)',
    (seed) => {
      const full = makeSyntheticNetwork(600, seed);
      const transform = createGraphTransformer();
      for (const page of growingPages(full, randomSizes(seed, 600))) {
        expect(transform(page, OPTIONS)).toEqual(transformNetwork(page, OPTIONS));
      }
    },
  );

  it('connects a commit to a parent that only arrives on a later page', () => {
    const full = makeSyntheticNetwork(40, 11);
    const transform = createGraphTransformer();
    const [first, second] = growingPages(full, [5, 35]);
    transform(first, OPTIONS);
    const view = transform(second, OPTIONS);
    expect(view.edges.some((edge) => edge.fromRow < 5 && edge.toRow >= 5)).toBe(true);
    expect(view).toEqual(transformNetwork(second, OPTIONS));
  });

  it('returns the same view object when no commits were added', () => {
    const page = makeSyntheticNetwork(50, 3);
    const transform = createGraphTransformer();
    expect(transform(page, OPTIONS)).toBe(transform(page, OPTIONS));
  });

  it('starts over when the commits are replaced rather than extended', () => {
    const a = makeSyntheticNetwork(80, 1);
    const b = makeSyntheticNetwork(80, 2);
    const transform = createGraphTransformer();
    transform(a, OPTIONS);
    expect(transform(b, OPTIONS)).toEqual(transformNetwork(b, OPTIONS));
  });

  it('follows the full transform when the mode switches back and forth', () => {
    const data = makeSyntheticNetwork(300, 5);
    const transform = createGraphTransformer();
    for (const mode of ['network', 'repo-only', 'network'] as const) {
      const options = { ...OPTIONS, mode };
      expect(transform(data, options)).toEqual(transformNetwork(data, options));
    }
  });

  it('falls back to the full transform when a page repeats a known commit', () => {
    const data = makeSyntheticNetwork(60, 4);
    const transform = createGraphTransformer();
    transform({ meta: data.meta, commits: data.commits.slice(0, 30) }, OPTIONS);
    const repeated = { meta: data.meta, commits: [...data.commits, data.commits[3]] };
    expect(transform(repeated, OPTIONS)).toEqual(transformNetwork(repeated, OPTIONS));
  });
});
