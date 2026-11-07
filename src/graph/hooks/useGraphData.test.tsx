import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { NetworkApiError } from '../lib/networkApi';
import type * as NetworkApi from '../lib/networkApi';
import type { FetchedInitialPage, RetryNotice } from '../lib/networkApi.types';
import { useGraphData } from './useGraphData';

type PageRequest = {
  onPending?: (attempt: number) => void;
  onRetry?: (notice: RetryNotice) => void;
  signal?: AbortSignal;
  resolve: (page: FetchedInitialPage) => void;
  reject: (error: Error) => void;
};

const requests = vi.hoisted(() => [] as PageRequest[]);
const olderRequests = vi.hoisted(() => [] as (() => void)[]);

vi.mock('../lib/networkApi', async (importOriginal) => ({
  ...(await importOriginal<typeof NetworkApi>()),
  createGithubNetworkClient: () => ({
    fetchInitialPage: (
      _owner: string,
      _repo: string,
      opts?: Pick<PageRequest, 'onPending' | 'onRetry' | 'signal'>,
    ) =>
      new Promise<FetchedInitialPage>((resolve, reject) => {
        requests.push({
          onPending: opts?.onPending,
          onRetry: opts?.onRetry,
          signal: opts?.signal,
          resolve,
          reject,
        });
      }),
    fetchOlderPage: () =>
      new Promise((resolve) => {
        olderRequests.push(() => resolve({ commits: [], nextEnd: 0 }));
      }),
  }),
}));

function page(message: string, nextEnd = 0): FetchedInitialPage {
  return {
    meta: {
      nethash: 'h',
      focus: 0,
      dates: [],
      users: [{ name: 'o', repo: 'r', heads: [{ name: 'main', id: 'a' }] }],
    },
    commits: [{ id: 'a', author: 0, time: 1, space: 0, parents: [], message }],
    nextEnd,
  };
}

function latest(): PageRequest {
  const request = requests.at(-1);
  if (!request) throw new Error('no request');
  return request;
}

async function loadedHook(args: Parameters<typeof useGraphData>[0], nextEnd = 0) {
  requests.length = 0;
  olderRequests.length = 0;
  const hook = renderHook((props) => useGraphData(props), { initialProps: args });
  await waitFor(() => expect(requests).toHaveLength(1));
  await act(async () => latest().resolve(page('first', nextEnd)));
  await waitFor(() => expect(hook.result.current.state.status).toBe('ready'));
  return hook;
}

describe('useGraphData', () => {
  it('counts GitHub retries while the first load is pending', async () => {
    requests.length = 0;
    const { result } = renderHook(() =>
      useGraphData({ owner: 'o', repo: 'r', mode: 'network', refreshKey: 0 }),
    );
    await waitFor(() => expect(requests).toHaveLength(1));

    act(() => latest().onPending?.(3));

    expect(result.current.state).toEqual({
      status: 'loading',
      progress: { pendingAttempts: 3, retry: null },
    });
  });

  it('keeps showing the previous commits while a refresh is in flight', async () => {
    const { result, rerender } = await loadedHook({
      owner: 'o',
      repo: 'r',
      mode: 'network',
      refreshKey: 0,
    });

    rerender({ owner: 'o', repo: 'r', mode: 'network', refreshKey: 1 });
    await waitFor(() => expect(requests).toHaveLength(2));

    expect(result.current.state).toMatchObject({ status: 'ready', refreshing: true });

    await act(async () => latest().resolve(page('second')));

    await waitFor(() =>
      expect(result.current.state).toMatchObject({ status: 'ready', refreshing: false }),
    );
    const state = result.current.state;
    expect(state.status === 'ready' && state.view.commits[0].subject).toBe('second');
  });

  it('keeps the previous commits and reports a failed refresh', async () => {
    const onRefreshFailed = vi.fn<() => void>();
    const { result, rerender } = await loadedHook({
      owner: 'o',
      repo: 'r',
      mode: 'network',
      refreshKey: 0,
      onRefreshFailed,
    });

    rerender({ owner: 'o', repo: 'r', mode: 'network', refreshKey: 1, onRefreshFailed });
    await waitFor(() => expect(requests).toHaveLength(2));
    await act(async () => latest().reject(new Error('offline')));

    await waitFor(() => expect(onRefreshFailed).toHaveBeenCalledTimes(1));
    expect(result.current.state).toMatchObject({ status: 'ready', refreshing: false });
  });

  it('drops the previous commits when switching to another repository', async () => {
    const { result, rerender } = await loadedHook({
      owner: 'o',
      repo: 'r',
      mode: 'network',
      refreshKey: 0,
    });

    rerender({ owner: 'o', repo: 'other', mode: 'network', refreshKey: 0 });
    await waitFor(() => expect(requests).toHaveLength(2));

    expect(result.current.state.status).toBe('loading');
  });

  it('allows loading older commits again after a refresh interrupts an older page', async () => {
    const onRefreshFailed = vi.fn<() => void>();
    const { result, rerender } = await loadedHook(
      { owner: 'o', repo: 'r', mode: 'network', refreshKey: 0, onRefreshFailed },
      5,
    );
    act(() => result.current.loadMore());
    expect(result.current.state).toMatchObject({ loadingMore: true });

    rerender({ owner: 'o', repo: 'r', mode: 'network', refreshKey: 1, onRefreshFailed });
    await waitFor(() => expect(requests).toHaveLength(2));
    await act(async () => latest().reject(new Error('offline')));
    await waitFor(() => expect(onRefreshFailed).toHaveBeenCalledTimes(1));

    expect(result.current.state).toMatchObject({ loadingMore: false, olderError: null });
    act(() => result.current.loadMore());
    expect(olderRequests).toHaveLength(2);
  });

  it('shows the retry countdown on the first load and clears it once the data arrives', async () => {
    requests.length = 0;
    const { result } = renderHook(() =>
      useGraphData({ owner: 'o', repo: 'r', mode: 'network', refreshKey: 0 }),
    );
    await waitFor(() => expect(requests).toHaveLength(1));
    const notice: RetryNotice = { kind: 'network', attempt: 2, maxAttempts: 3, resumeAt: 9000 };

    act(() => latest().onRetry?.(notice));
    expect(result.current.state).toMatchObject({ status: 'loading', progress: { retry: notice } });

    await act(async () => latest().resolve(page('first')));
    await waitFor(() =>
      expect(result.current.state).toMatchObject({ status: 'ready', progress: { retry: null } }),
    );
  });

  it('cancels the previous repository request when switching repositories', async () => {
    const { rerender } = await loadedHook({
      owner: 'o',
      repo: 'r',
      mode: 'network',
      refreshKey: 0,
    });
    rerender({ owner: 'o', repo: 'r', mode: 'network', refreshKey: 1 });
    await waitFor(() => expect(requests).toHaveLength(2));
    const refresh = latest();
    expect(refresh.signal?.aborted).toBe(false);

    rerender({ owner: 'o', repo: 'other', mode: 'network', refreshKey: 0 });

    expect(refresh.signal?.aborted).toBe(true);
  });

  it('cancels a pending retry when a refresh supersedes the load', async () => {
    requests.length = 0;
    const { rerender } = renderHook(
      (props: Parameters<typeof useGraphData>[0]) => useGraphData(props),
      {
        initialProps: { owner: 'o', repo: 'r', mode: 'network', refreshKey: 0 },
      },
    );
    await waitFor(() => expect(requests).toHaveLength(1));
    const first = latest();

    rerender({ owner: 'o', repo: 'r', mode: 'network', refreshKey: 1 });

    expect(first.signal?.aborted).toBe(true);
  });

  it('shows the final error with its kind when retries are exhausted on the first load', async () => {
    requests.length = 0;
    const { result } = renderHook(() =>
      useGraphData({ owner: 'o', repo: 'r', mode: 'network', refreshKey: 0 }),
    );
    await waitFor(() => expect(requests).toHaveLength(1));

    await act(async () => latest().reject(new NetworkApiError('rateLimit', 'slow down', 429)));

    await waitFor(() =>
      expect(result.current.state).toEqual({
        status: 'error',
        kind: 'rateLimit',
        message: 'slow down',
      }),
    );
  });
});
