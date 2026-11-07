import { describe, expect, it } from 'vitest';
import { visibleColumns } from './listColumns';

describe('visibleColumns', () => {
  it('shows every column when there is room or the width is still unknown', () => {
    expect(visibleColumns(700)).toEqual({ sha: true, date: true, authorName: true });
    expect(visibleColumns(0)).toEqual({ sha: true, date: true, authorName: true });
  });

  it('drops the sha first, then the author name, then the date as the list narrows', () => {
    expect(visibleColumns(420)).toEqual({ sha: false, date: true, authorName: true });
    expect(visibleColumns(330)).toEqual({ sha: false, date: true, authorName: false });
    expect(visibleColumns(250)).toEqual({ sha: false, date: false, authorName: false });
  });

  it('always leaves the subject a readable width', () => {
    for (const width of [250, 330, 420, 460, 700]) {
      const { sha, date, authorName } = visibleColumns(width);
      const used = (sha ? 64 : 0) + (date ? 64 : 0) + (authorName ? 128 : 32);
      expect(width - used).toBeGreaterThanOrEqual(200);
    }
  });
});
