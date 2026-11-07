import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type * as NetworkApi from '../lib/networkApi';
import type {
  FetchedInitialPage,
  FetchedOlderPage,
  NetworkRawCommit,
  RetryNotice,
} from '../lib/networkApi.types';
import type * as Transform from '../lib/transform';
import { SEEK_CONCURRENCY, useGraphData } from './useGraphData';

const TOTAL = 5000;
const PAGE = 100;
const DEEP_TARGET = `p${TOTAL - 3000}`;

const stats = vi.hoisted(() => ({
  olderCalls: 0,
  inFlight: 0,
  maxInFlight: 0,
  transforms: 0,
  failEnd: null as number | null,
  signals: [] as AbortSignal[],
  onRetry: undefined as ((notice: RetryNotice) => void) | undefined,
}));

const gate = vi.hoisted(() => ({ hold: false, release: [] as (() => void)[] }));

function commitAt(position: number): NetworkRawCommit {
  return {
    id: `p${position}`,
    author: 0,
    time: position,
    space: 0,
    message: `commit ${position}`,
    parents: position > 0 ? [{ sha: `p${position - 1}`, space: 0 }] : [],
  };
}

function newestFirst(startInclusive: number, endExclusive: number): NetworkRawCommit[] {
  const commits: NetworkRawCommit[] = [];
  for (let p = endExclusive - 1; p >= startInclusive; p--) commits.push(commitAt(p));
  return commits;
}

vi.mock('../lib/transform', async (importOriginal) => {
  const original = await importOriginal<typeof Transform>();
  return {
    ...original,
    transformNetwork: (...args: Parameters<typeof original.transformNetwork>) => {
      stats.transforms += 1;
      return original.transformNetwork(...args);
    },
  };
});

vi.mock('../lib/networkApi', async (importOriginal) => ({
  ...(await importOriginal<typeof NetworkApi>()),
  createGithubNetworkClient: () => ({
    fetchInitialPage: async (): Promise<FetchedInitialPage> => ({
      meta: {
        nethash: 'h',
        focus: 0,
        dates: [],
        name: 'r',
        users: [{ name: 'o', repo: 'r', heads: [{ name: 'main', id: `p${TOTAL - 1}` }] }],
      },
      commits: newestFirst(TOTAL - PAGE, TOTAL),
      nextEnd: TOTAL - PAGE,
      totalCount: TOTAL,
    }),
    fetchOlderPage: async (
      _owner: string,
      _repo: string,
      _meta: unknown,
      end: number,
      opts?: { signal?: AbortSignal; onRetry?: (notice: RetryNotice) => void },
    ): Promise<FetchedOlderPage> => {
      if (opts?.signal) stats.signals.push(opts.signal);
      stats.onRetry = opts?.onRetry;
      stats.olderCalls += 1;
      stats.inFlight += 1;
      stats.maxInFlight = Math.max(stats.maxInFlight, stats.inFlight);
      if (gate.hold) await new Promise<void>((resolve) => gate.release.push(resolve));
      await Promise.resolve();
      stats.inFlight -= 1;
      if (stats.failEnd === end) throw new Error('offline');
      const start = Math.max(0, end - PAGE);
      return { commits: newestFirst(start, end), nextEnd: start, exhausted: start === 0 };
    },
  }),
}));

async function readyHook() {
  let renders = 0;
  const hook = renderHook(() => {
    renders += 1;
    return useGraphData({ owner: 'o', repo: 'r', mode: 'network' });
  });
  await waitFor(() => expect(hook.result.current.state.status).toBe('ready'));
  return { ...hook, renders: () => renders };
}

type ReadyHook = Awaited<ReturnType<typeof readyHook>>;

function readyState(hook: ReadyHook) {
  const state = hook.result.current.state;
  if (state.status !== 'ready') throw new Error('not ready');
  return state;
}

beforeEach(() => {
  Object.assign(stats, {
    olderCalls: 0,
    inFlight: 0,
    maxInFlight: 0,
    transforms: 0,
    failEnd: null,
    signals: [],
    onRetry: undefined,
  });
  gate.hold = false;
  gate.release = [];
});

describe('useGraphData seekTo', () => {
  it('reaches a deep commit with one transform, fetching a few pages concurrently', async () => {
    const hook = await readyHook();
    const baseTransforms = stats.transforms;
    const baseRenders = hook.renders();

    act(() => hook.result.current.seekTo(DEEP_TARGET));
    await waitFor(() => expect(readyState(hook).seek).toBeNull());

    const state = readyState(hook);
    expect(state.view.commits.some((c) => c.sha === DEEP_TARGET)).toBe(true);
    expect(state.loadingMore).toBe(false);
    expect(stats.maxInFlight).toBeGreaterThan(1);
    expect(stats.maxInFlight).toBeLessThanOrEqual(SEEK_CONCURRENCY);
    expect(stats.transforms - baseTransforms).toBe(1);
    console.info(
      `seekTo depth 3000: ${stats.olderCalls} page requests in ${Math.ceil(stats.olderCalls / SEEK_CONCURRENCY)} sequential batches, ${stats.transforms - baseTransforms} transform, ${hook.renders() - baseRenders} renders`,
    );
  });

  it('needs far fewer transforms than paging with loadMore one page at a time', async () => {
    const hook = await readyHook();
    const baseTransforms = stats.transforms;
    const baseRenders = hook.renders();

    while (!readyState(hook).view.commits.some((c) => c.sha === DEEP_TARGET)) {
      act(() => hook.result.current.loadMore());
      await waitFor(() => expect(readyState(hook).loadingMore).toBe(false));
    }

    console.info(
      `loadMore depth 3000: ${stats.olderCalls} sequential round trips, ${stats.transforms - baseTransforms} transforms, ${hook.renders() - baseRenders} renders`,
    );
    expect(stats.transforms - baseTransforms).toBeGreaterThanOrEqual(29);
  });

  it('keeps pages in order and leaves the paging cursor right after the loaded commits', async () => {
    const hook = await readyHook();
    act(() => hook.result.current.seekTo(`p${TOTAL - 250}`));
    await waitFor(() => expect(readyState(hook).seek).toBeNull());

    const state = readyState(hook);
    const times = state.rawCommits.map((c) => c.time);
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(state.nextEnd).toBe(TOTAL - state.rawCommits.length);
  });

  it('stops after the history is exhausted when the commit does not exist', async () => {
    const hook = await readyHook();
    act(() => hook.result.current.seekTo('missing'));
    await waitFor(() => expect(readyState(hook).seek).toBeNull());

    const state = readyState(hook);
    expect(state.hasMore).toBe(false);
    expect(state.rawCommits).toHaveLength(TOTAL);
  });

  it('settles on cancel without fetching further batches', async () => {
    const hook = await readyHook();
    gate.hold = true;
    act(() => hook.result.current.seekTo('missing'));
    await waitFor(() => expect(gate.release).toHaveLength(SEEK_CONCURRENCY));
    expect(readyState(hook).seek).not.toBeNull();

    act(() => hook.result.current.cancelSeek());
    expect(readyState(hook)).toMatchObject({ seek: null, loadingMore: false, hasMore: true });

    gate.hold = false;
    await act(async () => gate.release.splice(0).forEach((release) => release()));
    expect(readyState(hook).rawCommits).toHaveLength(PAGE);
    expect(stats.olderCalls).toBe(SEEK_CONCURRENCY);
  });

  it('reports a failed page as an older-history error and keeps the cursor consistent', async () => {
    const hook = await readyHook();
    stats.failEnd = TOTAL - PAGE * 6;
    act(() => hook.result.current.seekTo('missing'));
    await waitFor(() => expect(readyState(hook).seek).toBeNull());

    const state = readyState(hook);
    expect(state.olderError).toMatchObject({ kind: 'unknown' });
    expect(state.loadingMore).toBe(false);
    expect(state.nextEnd).toBe(TOTAL - state.rawCommits.length);
  });

  it('ignores a seek requested while another page load is in flight', async () => {
    const hook = await readyHook();
    gate.hold = true;
    act(() => hook.result.current.loadMore());
    act(() => hook.result.current.seekTo('missing'));
    expect(readyState(hook).seek).toBeNull();
    gate.hold = false;
    await act(async () => gate.release.splice(0).forEach((release) => release()));
  });

  it('never has more page requests in flight than the seek concurrency', async () => {
    const hook = await readyHook();
    gate.hold = true;
    act(() => hook.result.current.seekTo('missing'));
    await waitFor(() => expect(gate.release).toHaveLength(SEEK_CONCURRENCY));
    await act(async () => {});
    expect(stats.inFlight).toBe(SEEK_CONCURRENCY);
    gate.hold = false;
    act(() => hook.result.current.cancelSeek());
    await act(async () => gate.release.splice(0).forEach((release) => release()));
  });

  it('aborts in-flight page requests when the seek is cancelled', async () => {
    const hook = await readyHook();
    gate.hold = true;
    act(() => hook.result.current.seekTo('missing'));
    await waitFor(() => expect(gate.release).toHaveLength(SEEK_CONCURRENCY));
    expect(stats.signals.every((signal) => !signal.aborted)).toBe(true);

    act(() => hook.result.current.cancelSeek());

    expect(stats.signals.every((signal) => signal.aborted)).toBe(true);
    gate.hold = false;
    await act(async () => gate.release.splice(0).forEach((release) => release()));
  });

  it('aborts in-flight page requests when the hook unmounts', async () => {
    const hook = await readyHook();
    gate.hold = true;
    act(() => hook.result.current.loadMore());
    await waitFor(() => expect(stats.signals).toHaveLength(1));

    hook.unmount();

    expect(stats.signals[0].aborted).toBe(true);
    gate.hold = false;
    gate.release.splice(0).forEach((release) => release());
  });

  it('shows the retry countdown while a page retries and clears it once the page arrives', async () => {
    const hook = await readyHook();
    gate.hold = true;
    act(() => hook.result.current.loadMore());
    await waitFor(() => expect(stats.onRetry).toBeDefined());
    const notice: RetryNotice = { kind: 'rateLimit', attempt: 1, maxAttempts: 3, resumeAt: 5000 };

    act(() => stats.onRetry?.(notice));
    expect(readyState(hook).retry).toEqual(notice);

    gate.hold = false;
    await act(async () => gate.release.splice(0).forEach((release) => release()));
    await waitFor(() => expect(readyState(hook).loadingMore).toBe(false));
    expect(readyState(hook).retry).toBeNull();
  });

  it('keeps the loaded commits and offers an inline retry when an older page finally fails', async () => {
    const hook = await readyHook();
    stats.failEnd = TOTAL - PAGE;
    act(() => hook.result.current.loadMore());
    await waitFor(() => expect(readyState(hook).olderError).not.toBeNull());

    const state = readyState(hook);
    expect(state.rawCommits).toHaveLength(PAGE);
    expect(state.view.commits).toHaveLength(PAGE);
    expect(state.retry).toBeNull();
    expect(state.hasMore).toBe(true);
  });
});
