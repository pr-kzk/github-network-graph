import { describe, expect, it } from 'vitest';
import { autoDetailCollapsed, autoDetailWidth } from './detailLayout';

describe('autoDetailWidth', () => {
  it('stays within the minimum and maximum widths', () => {
    expect(autoDetailWidth(800)).toBe(280);
    expect(autoDetailWidth(3000)).toBe(480);
  });
});

describe('autoDetailCollapsed', () => {
  it('collapses in narrow windows only', () => {
    expect(autoDetailCollapsed(900)).toBe(true);
    expect(autoDetailCollapsed(700)).toBe(true);
    expect(autoDetailCollapsed(1000)).toBe(false);
    expect(autoDetailCollapsed(1400)).toBe(false);
  });
});
