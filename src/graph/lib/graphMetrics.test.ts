import { describe, expect, it } from 'vitest';
import { createGraphLayout } from './graphMetrics';

describe('createGraphLayout', () => {
  it('keeps the natural width and spacing when the lanes fit', () => {
    const layout = createGraphLayout(3, 1000);
    expect(layout.width).toBe(14 + 2 * 14 + 12);
    expect(layout.laneX(2) - layout.laneX(1)).toBe(14);
  });

  it.each([
    ['a share of the list width however many lanes exist', 500, 1000, 300],
    ['a share of a narrower list', 500, 600, 180],
    ['an absolute maximum on very wide lists', 500, 5000, 360],
    ['an absolute maximum while the list width is unknown', 500, 0, 360],
    ['a minimum width on narrow lists', 500, 40, 36],
    ['a minimum width for a single lane', 1, 1000, 36],
  ])('limits the width to %s', (_, lanes, listWidth, expected) => {
    expect(createGraphLayout(lanes, listWidth).width).toBe(expected);
  });

  it('compresses the lane spacing so every lane stays inside the column', () => {
    const layout = createGraphLayout(30, 1000);
    expect(layout.width).toBe(300);
    expect(layout.crowded).toBe(false);
    expect(layout.laneX(1) - layout.laneX(0)).toBeLessThan(14);
    expect(layout.laneX(29)).toBeLessThanOrEqual(layout.width - 12);
  });

  describe('with more lanes than fit', () => {
    const lanes = 500;

    function visibleXs(layout: ReturnType<typeof createGraphLayout>, count: number) {
      return Array.from({ length: count }, (_, lane) => lane)
        .filter((lane) => !layout.isFolded(lane))
        .map((lane) => layout.laneX(lane));
    }

    it('never places two lanes on the same x unless they are folded into the gutter', () => {
      const layout = createGraphLayout(lanes, 1000);
      const xs = visibleXs(layout, lanes);
      expect(new Set(xs).size).toBe(xs.length);
      expect(xs).not.toContain(layout.gutterX);
    });

    it('keeps the readable minimum spacing between visible lanes', () => {
      const layout = createGraphLayout(lanes, 1000);
      const xs = visibleXs(layout, lanes).sort((a, b) => a - b);
      const gaps = xs.slice(1).map((x, i) => x - xs[i]);
      expect(Math.min(...gaps)).toBeGreaterThanOrEqual(7);
    });

    it('sends every folded lane to the gutter at the right edge of the track', () => {
      const layout = createGraphLayout(lanes, 1000);
      const folded = Array.from({ length: lanes }, (_, lane) => lane).filter(layout.isFolded);
      expect(folded.length).toBe(layout.foldedCount);
      expect(new Set(folded.map(layout.laneX))).toEqual(new Set([layout.gutterX]));
      expect(layout.gutterX).toBe(layout.width - 12);
      expect(layout.crowded).toBe(true);
    });

    it('keeps the lanes of the priority lines visible', () => {
      const layout = createGraphLayout(lanes, 1000, [450, 300, 0]);
      expect([450, 300, 0].map(layout.isFolded)).toEqual([false, false, false]);
      expect(layout.isPriority(450)).toBe(true);
      expect(layout.isPriority(1)).toBe(false);
    });

    it('does not move a visible lane when more lanes are loaded later', () => {
      const before = createGraphLayout(lanes, 1000, [0, 3]);
      const after = createGraphLayout(lanes + 40, 1000, [0, 3]);
      const stable = [0, 1, 2, 3, 4, 5].map((lane) => [before.laneX(lane), after.laneX(lane)]);
      for (const [x1, x2] of stable) expect(x2).toBe(x1);
    });

    it('does not fold anything while the lanes fit', () => {
      const layout = createGraphLayout(10, 1000);
      expect(layout.foldedCount).toBe(0);
      expect(layout.isFolded(9)).toBe(false);
    });
  });
});
