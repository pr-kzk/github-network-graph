import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRepoDocumentTitle } from './useDocumentTitle';

describe('useRepoDocumentTitle', () => {
  beforeEach(() => {
    document.title = 'Git Graph for GitHub';
  });

  it('names the tab after the repository', () => {
    renderHook(() => useRepoDocumentTitle('numpy', 'numpy'));
    expect(document.title).toBe('numpy/numpy - Git Graph');
  });

  it('follows the repository when it changes', () => {
    const { rerender } = renderHook(({ o, r }) => useRepoDocumentTitle(o, r), {
      initialProps: { o: 'numpy', r: 'numpy' },
    });
    rerender({ o: 'facebook', r: 'react' });
    expect(document.title).toBe('facebook/react - Git Graph');
  });

  it('keeps the default title until a repository is chosen', () => {
    renderHook(() => useRepoDocumentTitle('', ''));
    expect(document.title).toBe('Git Graph for GitHub');
  });
});
