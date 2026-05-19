import { describe, expect, it } from 'vitest';
import { parseRepoFromInput, parseRepoFromUrl } from './parseUrl';

describe('parseRepoFromUrl', () => {
  it('extracts owner/repo from a canonical GitHub URL', () => {
    expect(parseRepoFromUrl('https://github.com/numpy/numpy')).toEqual({
      owner: 'numpy',
      repo: 'numpy',
    });
  });

  it('handles trailing slash', () => {
    expect(parseRepoFromUrl('https://github.com/numpy/numpy/')).toEqual({
      owner: 'numpy',
      repo: 'numpy',
    });
  });

  it('handles sub paths (issues, pulls, network, blob)', () => {
    expect(parseRepoFromUrl('https://github.com/numpy/numpy/network')).toEqual({
      owner: 'numpy',
      repo: 'numpy',
    });
    expect(parseRepoFromUrl('https://github.com/foo/bar/blob/main/README.md')).toEqual({
      owner: 'foo',
      repo: 'bar',
    });
    expect(parseRepoFromUrl('https://github.com/foo/bar/pull/123')).toEqual({
      owner: 'foo',
      repo: 'bar',
    });
  });

  it('accepts www.github.com', () => {
    expect(parseRepoFromUrl('https://www.github.com/foo/bar')).toEqual({
      owner: 'foo',
      repo: 'bar',
    });
  });

  it('strips trailing .git from repo segment', () => {
    expect(parseRepoFromUrl('https://github.com/foo/bar.git')).toEqual({
      owner: 'foo',
      repo: 'bar',
    });
  });

  it('rejects non-github hosts', () => {
    expect(parseRepoFromUrl('https://gitlab.com/foo/bar')).toBeNull();
    expect(parseRepoFromUrl('https://gist.github.com/foo/abc')).toBeNull();
  });

  it('rejects reserved owners (orgs, settings, marketplace)', () => {
    expect(parseRepoFromUrl('https://github.com/orgs/openai')).toBeNull();
    expect(parseRepoFromUrl('https://github.com/settings/profile')).toBeNull();
    expect(parseRepoFromUrl('https://github.com/marketplace/category')).toBeNull();
  });

  it('rejects bare GitHub homepage and single segment paths', () => {
    expect(parseRepoFromUrl('https://github.com/')).toBeNull();
    expect(parseRepoFromUrl('https://github.com/numpy')).toBeNull();
  });

  it('returns null for invalid / empty input', () => {
    expect(parseRepoFromUrl(null)).toBeNull();
    expect(parseRepoFromUrl('')).toBeNull();
    expect(parseRepoFromUrl('not a url')).toBeNull();
  });
});

describe('parseRepoFromInput', () => {
  it('falls back to owner/repo shorthand', () => {
    expect(parseRepoFromInput('numpy/numpy')).toEqual({ owner: 'numpy', repo: 'numpy' });
    expect(parseRepoFromInput('  numpy / numpy  ')).toEqual({ owner: 'numpy', repo: 'numpy' });
  });

  it('still accepts full URLs', () => {
    expect(parseRepoFromInput('https://github.com/foo/bar')).toEqual({ owner: 'foo', repo: 'bar' });
  });

  it('rejects nonsense', () => {
    expect(parseRepoFromInput('')).toBeNull();
    expect(parseRepoFromInput('just-text')).toBeNull();
    expect(parseRepoFromInput('a/b/c')).toBeNull();
  });
});
