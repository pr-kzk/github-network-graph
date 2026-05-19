import { describe, expect, it } from 'vitest';
import { t, tWith } from './i18n';

describe('t', () => {
  it('returns the English message for a known key', () => {
    expect(t('popup_header_title')).toBe('Git Graph for GitHub');
  });

  it('returns a placeholder substituted message when subs is a string', () => {
    expect(t('relative_minutes', '5')).toBe('5 min ago');
  });

  it('returns a placeholder substituted message when subs is an array', () => {
    expect(t('popup_launcher_open_detected', ['numpy/numpy'])).toBe('Open numpy/numpy');
  });
});

describe('tWith', () => {
  it('expands named placeholders in declaration order', () => {
    expect(tWith('popup_launcher_open_detected', { repo: 'numpy/numpy' })).toBe(
      'Open numpy/numpy',
    );
  });

  it('expands a numeric placeholder for relative_hours', () => {
    expect(tWith('relative_hours', { n: '3' })).toBe('3 h ago');
  });
});
