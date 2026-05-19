import { describe, it, expect } from 'vitest';
import {
  formatRelativeFromMs,
  formatRelativeFromDateString,
  formatFullDate,
} from './format';

const NOW = Date.UTC(2025, 5, 1, 12, 0, 0); // 2025-06-01T12:00:00Z (deterministic)
const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatRelativeFromMs (short)', () => {
  it('returns "now" within 1 minute', () => {
    expect(formatRelativeFromMs(NOW - 30 * SECOND, { now: NOW })).toBe('now');
  });
  it('returns minutes for sub-hour diffs', () => {
    expect(formatRelativeFromMs(NOW - 25 * MINUTE, { now: NOW })).toBe('25m');
  });
  it('returns hours for sub-day diffs', () => {
    expect(formatRelativeFromMs(NOW - 3 * HOUR, { now: NOW })).toBe('3h');
  });
  it('returns days for sub-month diffs', () => {
    expect(formatRelativeFromMs(NOW - 2 * DAY, { now: NOW })).toBe('2d');
  });
  it('returns months for sub-year diffs', () => {
    expect(formatRelativeFromMs(NOW - 60 * DAY, { now: NOW })).toBe('2mo');
  });
  it('returns years for >= 1 year diffs', () => {
    expect(formatRelativeFromMs(NOW - 400 * DAY, { now: NOW })).toBe('1y');
  });
});

describe('formatRelativeFromMs (long)', () => {
  // テスト fixture は en/messages.json を再利用するため、long 文言の期待値も英語版に合わせる。
  const long = { now: NOW, style: 'long' as const };
  it('returns "just now" within 1 minute', () => {
    expect(formatRelativeFromMs(NOW - 30 * SECOND, long)).toBe('just now');
  });
  it('returns "X min ago" for minutes', () => {
    expect(formatRelativeFromMs(NOW - 25 * MINUTE, long)).toBe('25 min ago');
  });
  it('returns "X h ago" for hours', () => {
    expect(formatRelativeFromMs(NOW - 3 * HOUR, long)).toBe('3 h ago');
  });
  it('returns "X d ago" for sub-week diffs', () => {
    expect(formatRelativeFromMs(NOW - 2 * DAY, long)).toBe('2 d ago');
  });
  it('returns "X w ago" for sub-4-week diffs', () => {
    expect(formatRelativeFromMs(NOW - 10 * DAY, long)).toBe('1 w ago');
  });
  it('falls back to toLocaleDateString for >= 4 weeks', () => {
    const result = formatRelativeFromMs(NOW - 60 * DAY, long);
    const expected = new Date(NOW - 60 * DAY).toLocaleDateString();
    expect(result).toBe(expected);
  });
});

describe('formatRelativeFromDateString', () => {
  it('returns "" for empty input', () => {
    expect(formatRelativeFromDateString('')).toBe('');
    expect(formatRelativeFromDateString(null)).toBe('');
    expect(formatRelativeFromDateString(undefined)).toBe('');
  });
  it('returns slice(0,7) for unparseable strings (CommitRow legacy behavior)', () => {
    expect(formatRelativeFromDateString('not-a-date-string')).toBe('not-a-d');
  });
  it('returns short relative for parseable ISO', () => {
    const iso = new Date(NOW - 25 * MINUTE).toISOString();
    expect(formatRelativeFromDateString(iso, { now: NOW })).toBe('25m');
  });
});

describe('formatFullDate', () => {
  it('returns "" for empty / null / undefined', () => {
    expect(formatFullDate('')).toBe('');
    expect(formatFullDate(null)).toBe('');
    expect(formatFullDate(undefined)).toBe('');
  });
  it('returns the input as-is for unparseable strings', () => {
    expect(formatFullDate('not-a-date')).toBe('not-a-date');
  });
  it('returns a non-empty locale string for valid ISO', () => {
    const iso = new Date(NOW).toISOString();
    const result = formatFullDate(iso);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
