import { describe, it, expect } from 'vitest';
import { isObject, asString, asNumber, errorMessage } from './errors';

describe('isObject', () => {
  it('returns false for null', () => {
    expect(isObject(null)).toBe(false);
  });
  it('returns false for primitives', () => {
    expect(isObject(undefined)).toBe(false);
    expect(isObject(42)).toBe(false);
    expect(isObject('x')).toBe(false);
    expect(isObject(true)).toBe(false);
  });
  it('returns true for plain object', () => {
    expect(isObject({})).toBe(true);
    expect(isObject({ a: 1 })).toBe(true);
  });
  it('returns true for arrays (narrowed to Record)', () => {
    expect(isObject([])).toBe(true);
  });
});

describe('asString', () => {
  it('returns fallback for non-string', () => {
    expect(asString(42)).toBe('');
    expect(asString(null, 'fb')).toBe('fb');
    expect(asString(undefined, 'fb')).toBe('fb');
    expect(asString({}, 'fb')).toBe('fb');
  });
  it('returns the value itself when string', () => {
    expect(asString('x')).toBe('x');
    expect(asString('', 'fb')).toBe('');
  });
});

describe('asNumber', () => {
  it('returns fallback for non-number', () => {
    expect(asNumber('x')).toBe(0);
    expect(asNumber(undefined, 10)).toBe(10);
    expect(asNumber(null, 10)).toBe(10);
  });
  it('returns the value itself when number', () => {
    expect(asNumber(3.14)).toBe(3.14);
    expect(asNumber(0)).toBe(0);
    expect(Number.isNaN(asNumber(Number.NaN))).toBe(true);
  });
});

describe('errorMessage', () => {
  it('unwraps Error.message', () => {
    expect(errorMessage(new Error('boom'), 'fb')).toBe('boom');
  });
  it('returns fallback for plain string', () => {
    expect(errorMessage('plain string', 'fb')).toBe('fb');
  });
  it('returns fallback for objects shaped like { message }', () => {
    expect(errorMessage({ message: 'fake' }, 'fb')).toBe('fb');
  });
  it('returns fallback for null / undefined', () => {
    expect(errorMessage(null, 'fb')).toBe('fb');
    expect(errorMessage(undefined, 'fb')).toBe('fb');
  });
});
