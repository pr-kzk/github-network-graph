import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { resetCommitDetailMemoryCacheForTest } from '../lib/commitDetailCache';
import { useCommitDetailExtra } from './useCommitDetailExtra';

const DIFF = 'diff --git a/a.ts b/a.ts\n@@ -1 +1,2 @@\n x\n+y\n';

const args = { owner: 'o', repo: 'r', sha: 'abc' };

function diffResponse(): Response {
  return new Response(DIFF, { headers: { 'content-type': 'text/plain' } });
}

beforeEach(() => {
  resetCommitDetailMemoryCacheForTest();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useCommitDetailExtra', () => {
  it('stays idle without a selected commit', () => {
    const { result } = renderHook(() => useCommitDetailExtra({ ...args, sha: null }));
    expect(result.current.state).toEqual({ status: 'idle' });
  });

  it('loads and then exposes the changed files', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => diffResponse()),
    );
    const { result } = renderHook(() => useCommitDetailExtra(args));
    expect(result.current.state.status).toBe('loading');
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
  });

  it('surfaces the error kind and recovers when retried', async () => {
    const fetchMock = vi.fn<() => Promise<Response>>(async () => {
      throw new TypeError('offline');
    });
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useCommitDetailExtra(args));
    await waitFor(() => expect(result.current.state.status).toBe('error'));
    expect(result.current.state).toMatchObject({ error: { kind: 'network' } });

    fetchMock.mockImplementation(async () => diffResponse());
    act(() => result.current.retry());
    expect(result.current.state.status).toBe('loading');
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
  });

  it('restarts loading when another commit is selected', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => diffResponse()),
    );
    const { result, rerender } = renderHook(
      (props: { sha: string }) => useCommitDetailExtra({ ...args, sha: props.sha }),
      { initialProps: { sha: 'abc' } },
    );
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    rerender({ sha: 'def' });
    expect(result.current.state.status).toBe('loading');
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
  });
});
