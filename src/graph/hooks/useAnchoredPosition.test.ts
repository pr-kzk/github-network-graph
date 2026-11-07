import { describe, expect, it } from 'vitest';
import { clampToViewport, flipAroundPointer } from './useAnchoredPosition';

const VIEWPORT = { width: 1000, height: 800 };
const SIZE = { width: 200, height: 100 };

describe('clampToViewport', () => {
  it('places the box at the pointer when it fits', () => {
    expect(clampToViewport({ x: 100, y: 120 }, SIZE, VIEWPORT)).toEqual({ left: 100, top: 120 });
  });

  it('pulls the box back inside the right and bottom edges', () => {
    expect(clampToViewport({ x: 950, y: 790 }, SIZE, VIEWPORT)).toEqual({ left: 792, top: 692 });
  });
});

describe('flipAroundPointer', () => {
  it('places the box below and right of the pointer when it fits', () => {
    expect(flipAroundPointer({ x: 100, y: 100 }, SIZE, VIEWPORT)).toEqual({ left: 114, top: 114 });
  });

  it('flips to the left and above the pointer near the bottom-right corner', () => {
    expect(flipAroundPointer({ x: 950, y: 780 }, SIZE, VIEWPORT)).toEqual({ left: 736, top: 666 });
  });

  it('keeps a margin from the top-left edge', () => {
    expect(flipAroundPointer({ x: 0, y: 0 }, { width: 2000, height: 2000 }, VIEWPORT)).toEqual({
      left: 8,
      top: 8,
    });
  });
});
