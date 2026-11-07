import type { ViewEdge } from './transform.types';

type EdgeIndex = {
  edges: readonly ViewEdge[];
  topRows: Int32Array;
  reachedRows: Int32Array;
};

const top = (edge: ViewEdge) => Math.min(edge.fromRow, edge.toRow);
const bottom = (edge: ViewEdge) => Math.max(edge.fromRow, edge.toRow);

export function buildEdgeIndex(input: readonly ViewEdge[]): EdgeIndex {
  const edges = [...input].sort((a, b) => top(a) - top(b));
  const topRows = new Int32Array(edges.length);
  const reachedRows = new Int32Array(edges.length);
  let reached = -1;
  edges.forEach((edge, i) => {
    topRows[i] = top(edge);
    reached = Math.max(reached, bottom(edge));
    reachedRows[i] = reached;
  });
  return { edges, topRows, reachedRows };
}

function firstIndexWhere(values: Int32Array, predicate: (value: number) => boolean): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (predicate(values[mid])) high = mid;
    else low = mid + 1;
  }
  return low;
}

export function edgesInRows(index: EdgeIndex, startRow: number, endRow: number): ViewEdge[] {
  const from = firstIndexWhere(index.reachedRows, (reached) => reached >= startRow);
  const to = firstIndexWhere(index.topRows, (topRow) => topRow >= endRow);
  const visible: ViewEdge[] = [];
  for (let i = from; i < to; i++) {
    if (bottom(index.edges[i]) >= startRow) visible.push(index.edges[i]);
  }
  return visible;
}
