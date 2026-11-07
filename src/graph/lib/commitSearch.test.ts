import { describe, expect, it } from 'vitest';
import { highlightSegments, NO_MATCHES, searchCommits, stepMatchRow } from './commitSearch';
import { makeCommit } from '../../../test/factories';

const COMMITS = [
  makeCommit('abcd1234'.padEnd(40, '0'), { subject: 'Fix Parser crash', authorName: 'Alice Doe' }),
  makeCommit('ef561234'.padEnd(40, '0'), { subject: 'Add docs', authorLogin: 'bob-the-dev' }),
  makeCommit('9999aaaa'.padEnd(40, '0'), {
    subject: 'Release',
    refs: [{ name: 'v2.0', isFocus: false, ownerName: 'fork-owner' }],
  }),
];

describe('searchCommits', () => {
  it('returns no matches for a blank query', () => {
    expect(searchCommits(COMMITS, '   ')).toBe(NO_MATCHES);
  });

  it.each([
    ['the subject regardless of case', 'parser', [0]],
    ['a SHA prefix of at least four characters', 'ef56', [1]],
    ['no SHA prefix shorter than four characters', 'ef5', []],
    ['the author name', 'alice', [0]],
    ['the author login', 'bob-the', [1]],
    ['a ref name', 'v2.0', [2]],
    ['a ref together with its owner name', 'fork-owner:v2', [2]],
    ['rows in ascending order', 'e', [0, 1, 2]],
  ])('matches %s', (_, query, rows) => {
    expect(searchCommits(COMMITS, query).rows).toEqual(rows);
  });

  it('exposes matched commits by sha', () => {
    const result = searchCommits(COMMITS, 'docs');
    expect(result.shas.has(COMMITS[1].sha)).toBe(true);
    expect(result.shas.has(COMMITS[0].sha)).toBe(false);
  });
});

describe('stepMatchRow', () => {
  const rows = [2, 5, 9];

  it('returns null when there are no matches', () => {
    expect(stepMatchRow([], 3, 1)).toBeNull();
  });

  it('starts at the first match going forward without a position', () => {
    expect(stepMatchRow(rows, null, 1)).toBe(2);
  });

  it('starts at the last match going backward without a position', () => {
    expect(stepMatchRow(rows, null, -1)).toBe(9);
  });

  it('moves to the next match after a non-matching row', () => {
    expect(stepMatchRow(rows, 3, 1)).toBe(5);
  });

  it('moves past the current match', () => {
    expect(stepMatchRow(rows, 5, 1)).toBe(9);
  });

  it('wraps from the last match to the first', () => {
    expect(stepMatchRow(rows, 9, 1)).toBe(2);
  });

  it('moves to the previous match', () => {
    expect(stepMatchRow(rows, 5, -1)).toBe(2);
  });

  it('wraps from the first match to the last', () => {
    expect(stepMatchRow(rows, 2, -1)).toBe(9);
  });
});

describe('highlightSegments', () => {
  it('returns the whole text unmarked for a blank query', () => {
    expect(highlightSegments('Fix bug', '')).toEqual([{ text: 'Fix bug', match: false, start: 0 }]);
  });

  it('marks every occurrence while keeping the original casing', () => {
    expect(highlightSegments('Fix fix', 'fix')).toEqual([
      { text: 'Fix', match: true, start: 0 },
      { text: ' ', match: false, start: 3 },
      { text: 'fix', match: true, start: 4 },
    ]);
  });

  it('keeps surrounding text unmarked', () => {
    expect(highlightSegments('a bug here', 'bug')).toEqual([
      { text: 'a ', match: false, start: 0 },
      { text: 'bug', match: true, start: 2 },
      { text: ' here', match: false, start: 5 },
    ]);
  });

  it('returns the whole text unmarked when nothing matches', () => {
    expect(highlightSegments('abc', 'zzz')).toEqual([{ text: 'abc', match: false, start: 0 }]);
  });

  it('returns a single empty segment for empty text', () => {
    expect(highlightSegments('', 'x')).toEqual([{ text: '', match: false, start: 0 }]);
  });
});
