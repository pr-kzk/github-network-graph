import { describe, expect, it } from 'vitest';
import { buildEdgeIndex, edgesInRows } from './edgeIndex';
import type { ViewEdge } from './transform.types';

function edge(fromRow: number, toRow: number): ViewEdge {
  return {
    fromSha: `s${fromRow}`,
    toSha: `s${toRow}`,
    fromRow,
    toRow,
    fromLane: 0,
    toLane: 0,
    isMerge: false,
  };
}

function bruteForce(edges: ViewEdge[], start: number, end: number): ViewEdge[] {
  return edges.filter(
    (e) => Math.max(e.fromRow, e.toRow) >= start && Math.min(e.fromRow, e.toRow) < end,
  );
}

const byKey = (a: ViewEdge, b: ViewEdge) =>
  (a.fromSha + a.toSha).localeCompare(b.fromSha + b.toSha);

describe('edgesInRows', () => {
  it('returns the edges that touch the row range, including long edges spanning it', () => {
    const edges = [edge(0, 1), edge(2, 3), edge(1, 40), edge(30, 31), edge(60, 61)];
    const found = edgesInRows(buildEdgeIndex(edges), 10, 35);
    expect(found.map((e) => e.fromSha).sort()).toEqual(['s1', 's30']);
  });

  it('includes edges that point to an earlier row than their source', () => {
    const edges = [edge(20, 5), edge(50, 51)];
    expect(edgesInRows(buildEdgeIndex(edges), 0, 10)).toEqual([edge(20, 5)]);
  });

  it('matches a full scan for arbitrary edges and ranges', () => {
    let seed = 7;
    const next = (max: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % max;
    };
    const edges = Array.from({ length: 400 }, () => edge(next(300), next(300)));
    const index = buildEdgeIndex(edges);
    for (let i = 0; i < 50; i++) {
      const start = next(300);
      const end = start + 1 + next(60);
      expect(edgesInRows(index, start, end).sort(byKey)).toEqual(
        bruteForce(edges, start, end).sort(byKey),
      );
    }
  });

  it('returns nothing for no edges', () => {
    expect(edgesInRows(buildEdgeIndex([]), 0, 10)).toEqual([]);
  });
});
