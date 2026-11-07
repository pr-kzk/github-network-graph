import { describe, expect, it } from 'vitest';
import { snapToRowWindow } from './graphWindow';

describe('snapToRowWindow', () => {
  it('covers every rendered row', () => {
    for (const [start, end] of [
      [0, 40],
      [13, 77],
      [1000, 1074],
      [29_950, 30_000],
    ]) {
      const window = snapToRowWindow(start, end, 30_000);
      expect(window.start).toBeLessThanOrEqual(start);
      expect(window.end).toBeGreaterThanOrEqual(end);
    }
  });

  it('keeps the same window while the rendered rows move within it', () => {
    const first = snapToRowWindow(100, 150, 30_000);
    const scrolled = snapToRowWindow(103, 153, 30_000);
    expect(scrolled).toEqual(first);
  });

  it('moves the window once the rendered rows cross its boundary', () => {
    const first = snapToRowWindow(100, 150, 30_000);
    const scrolled = snapToRowWindow(190, 240, 30_000);
    expect(scrolled.start).toBeGreaterThan(first.start);
  });

  it('stays bounded however long the history is', () => {
    const { start, end } = snapToRowWindow(15_000, 15_074, 1_000_000);
    expect(end - start).toBeLessThan(200);
  });

  it('never extends past the loaded rows', () => {
    expect(snapToRowWindow(0, 10, 5)).toEqual({ start: 0, end: 5 });
  });
});
