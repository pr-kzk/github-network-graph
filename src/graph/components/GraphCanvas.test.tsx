import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { createGraphLayout } from '../lib/graphMetrics';
import type { GraphView, ViewCommit, ViewEdge } from '../lib/transform.types';
import { GraphCanvas } from './GraphCanvas';

const sha = (row: number) => String(row).padStart(40, '0');

function makeView(rows: number): GraphView {
  const commits: ViewCommit[] = Array.from({ length: rows }, (_, row) => ({
    sha: sha(row),
    shortSha: sha(row).slice(0, 7),
    row,
    lane: row % 3,
    time: rows - row,
    dateLabel: '',
    authorName: '',
    authorLogin: '',
    authorRepo: '',
    message: '',
    subject: '',
    parents: row + 1 < rows ? [sha(row + 1)] : [],
    refs: [],
  }));
  const edges: ViewEdge[] = commits.slice(0, -1).map((c, row) => ({
    fromSha: c.sha,
    toSha: sha(row + 1),
    fromRow: row,
    toRow: row + 1,
    fromLane: c.lane,
    toLane: (row + 1) % 3,
    isMerge: false,
  }));
  return {
    commits,
    edges,
    laneCount: 3,
    branches: [],
    forkBranches: [],
  };
}

function renderCanvas(view: GraphView, rangeStart: number, rangeEnd: number) {
  const layout = createGraphLayout(view.laneCount, 800);
  const props = { view, selectedSha: null, pathShas: null, layout };
  const utils = render(<GraphCanvas {...props} rangeStart={rangeStart} rangeEnd={rangeEnd} />);
  return {
    ...utils,
    scrollTo: (start: number, end: number) =>
      utils.rerender(<GraphCanvas {...props} rangeStart={start} rangeEnd={end} />),
  };
}

describe('GraphCanvas', () => {
  it('draws about as many shapes for a huge history as for a short one', () => {
    const short = renderCanvas(makeView(500), 100, 170);
    const shortCount = short.container.querySelectorAll('svg circle, svg path, svg line').length;
    short.unmount();
    const long = renderCanvas(makeView(30_000), 15_000, 15_070);
    const longCount = long.container.querySelectorAll('svg circle, svg path, svg line').length;
    expect(longCount).toBe(shortCount);
    expect(longCount).toBeLessThan(500);
  });

  it('keeps the drawn shapes untouched while scrolling within the same block of rows', () => {
    const { container, scrollTo } = renderCanvas(makeView(2_000), 100, 170);
    const before = container.querySelector('svg circle');
    scrollTo(103, 173);
    expect(container.querySelector('svg circle')).toBe(before);
  });

  it('draws the rows that scroll into view past the block boundary', () => {
    const view = makeView(2_000);
    const { container, scrollTo } = renderCanvas(view, 100, 170);
    const ys = () => [...container.querySelectorAll('svg circle')].map((c) => c.getAttribute('cy'));
    const lastRowY = 1_999 * 26 + 13;
    scrollTo(1_900, 2_000);
    expect(ys()).toContain(String(lastRowY));
  });

  it('is positioned over the rows it draws instead of spanning the whole history', () => {
    const { container } = renderCanvas(makeView(30_000), 15_000, 15_070);
    const svg = container.querySelector('svg');
    expect(Number(svg?.getAttribute('height'))).toBeLessThan(10_000);
    expect(svg?.style.top).toBe(`${Math.floor(15_000 / 48) * 48 * 26}px`);
  });

  it('does not take pointer events away from the rows beneath it', () => {
    const { container } = renderCanvas(makeView(100), 0, 40);
    expect(container.querySelector('svg')).toHaveClass('pointer-events-none');
    expect(container.querySelector('svg [style*="pointer-events"]')).toBeNull();
  });
});
