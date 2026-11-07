import { describe, expect, it } from 'vitest';
import { clampToViewport, flipAroundPointer } from './useAnchoredPosition';

const VIEWPORT = { width: 1000, height: 800 };
const SIZE = { width: 200, height: 100 };

describe('clampToViewport', () => {
  it.each([
    ['at the pointer when it fits', { x: 100, y: 120 }, { left: 100, top: 120 }],
    ['back inside the right and bottom edges', { x: 950, y: 790 }, { left: 792, top: 692 }],
  ])('places the box %s', (_, pointer, expected) => {
    expect(clampToViewport(pointer, SIZE, VIEWPORT)).toEqual(expected);
  });
});

describe('flipAroundPointer', () => {
  it.each([
    ['below and right of the pointer when it fits', { x: 100, y: 100 }, { left: 114, top: 114 }],
    [
      'left and above the pointer near the bottom-right corner',
      { x: 950, y: 780 },
      { left: 736, top: 666 },
    ],
  ])('places the box %s', (_, pointer, expected) => {
    expect(flipAroundPointer(pointer, SIZE, VIEWPORT)).toEqual(expected);
  });

  it('keeps a margin from the top-left edge', () => {
    expect(flipAroundPointer({ x: 0, y: 0 }, { width: 2000, height: 2000 }, VIEWPORT)).toEqual({
      left: 8,
      top: 8,
    });
  });
});
