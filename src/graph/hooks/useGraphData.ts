import { useCallback, useEffect, useMemo, useReducer, useRef, type Dispatch } from 'react';
import { assertNever } from '@/shared/errors';
import { t } from '@/shared/i18n';
import type { GraphMode } from '@/shared/storage';
import { trackEvent } from '@/shared/telemetry';
import {
  CHUNK_PAGE_SIZE,
  createGithubNetworkClient,
  toGraphError,
  type GraphErrorInfo,
} from '../lib/networkApi';
import type { NetworkMeta, NetworkRawCommit, RetryNotice } from '../lib/networkApi.types';
import { transformNetwork } from '../lib/transform';
import type { GraphView } from '../lib/transform.types';

export const SEEK_CONCURRENCY = 2;

type SeekProgress = { buffer: NetworkRawCommit[]; nextEnd: number };

type ReadyFields = {
  meta: NetworkMeta;
  rawCommits: NetworkRawCommit[];
  nextEnd: number;
  hasMore: boolean;
  loadingMore: boolean;
  olderError: GraphErrorInfo | null;
  seek: SeekProgress | null;
  refreshing: boolean;
  pendingAttempts: number;
  retry: RetryNotice | null;
};

type ReadyRaw = { status: 'ready' } & ReadyFields;

type RawState =
  | { status: 'idle' }
  | { status: 'loading'; pendingAttempts: number; retry: RetryNotice | null }
  | ({ status: 'error' } & GraphErrorInfo)
  | ReadyRaw;

export type GraphDataState = Exclude<RawState, ReadyRaw> | (ReadyRaw & { view: GraphView });

type UseGraphDataResult = {
  state: GraphDataState;
  loadMore: () => void;
  seekTo: (sha: string) => void;
  cancelSeek: () => void;
};

type UseGraphDataArgs = {
  owner: string;
  repo: string;
  mode: GraphMode;
  refreshKey: number;
  onRefreshFailed?: () => void;
};

type Action =
  | { type: 'reset' }
  | { type: 'init/start' }
  | { type: 'refresh/start' }
  | { type: 'pending'; attempt: number }
  | { type: 'retry'; notice: RetryNotice }
  | {
      type: 'init/success';
      meta: NetworkMeta;
      rawCommits: NetworkRawCommit[];
      nextEnd: number;
    }
  | { type: 'init/error'; error: GraphErrorInfo }
  | { type: 'refresh/error' }
  | { type: 'older/start' }
  | {
      type: 'older/success';
      commits: NetworkRawCommit[];
      nextEnd: number;
    }
  | { type: 'older/error'; error: GraphErrorInfo }
  | { type: 'seek/start' }
  | { type: 'seek/progress'; commits: NetworkRawCommit[]; nextEnd: number }
  | { type: 'seek/end'; error?: GraphErrorInfo };

const IDLE: RawState = { status: 'idle' };

function settleSeek(state: ReadyRaw, error: GraphErrorInfo | null): RawState {
  if (!state.seek) return state;
  return {
    ...state,
    rawCommits: [...state.rawCommits, ...state.seek.buffer],
    nextEnd: state.seek.nextEnd,
    hasMore: state.seek.nextEnd > 0,
    loadingMore: false,
    olderError: error,
    seek: null,
    retry: null,
  };
}

function reducer(state: RawState, action: Action): RawState {
  switch (action.type) {
    case 'reset':
      return IDLE;
    case 'init/start':
      return LOADING;
    case 'refresh/start':
      if (state.status !== 'ready') return LOADING;
      return {
        ...state,
        refreshing: true,
        loadingMore: false,
        olderError: null,
        seek: null,
        pendingAttempts: 0,
        retry: null,
      };
    case 'pending':
      if (state.status === 'loading' || state.status === 'ready') {
        return { ...state, pendingAttempts: action.attempt };
      }
      return state;
    case 'retry':
      if (state.status === 'loading' || state.status === 'ready') {
        return { ...state, retry: action.notice };
      }
      return state;
    case 'init/success':
      return {
        status: 'ready',
        meta: action.meta,
        rawCommits: action.rawCommits,
        nextEnd: action.nextEnd,
        hasMore: action.nextEnd > 0,
        loadingMore: false,
        olderError: null,
        seek: null,
        refreshing: false,
        pendingAttempts: 0,
        retry: null,
      };
    case 'init/error':
      return { status: 'error', ...action.error };
    case 'refresh/error':
      if (state.status !== 'ready') return state;
      return { ...state, refreshing: false, pendingAttempts: 0, retry: null };
    case 'older/start':
      if (state.status !== 'ready') return state;
      return { ...state, loadingMore: true, olderError: null, retry: null };
    case 'older/success':
      if (state.status !== 'ready') return state;
      return {
        ...state,
        rawCommits: [...state.rawCommits, ...action.commits],
        nextEnd: action.nextEnd,
        hasMore: action.nextEnd > 0,
        loadingMore: false,
        olderError: null,
        retry: null,
      };
    case 'older/error':
      if (state.status !== 'ready') return state;
      return {
        ...state,
        loadingMore: false,
        olderError: action.error,
        retry: null,
      };
    case 'seek/start':
      if (state.status !== 'ready') return state;
      return {
        ...state,
        loadingMore: true,
        olderError: null,
        seek: { buffer: [], nextEnd: state.nextEnd },
        retry: null,
      };
    case 'seek/progress':
      if (state.status !== 'ready' || !state.seek) return state;
      return {
        ...state,
        seek: {
          buffer: [...state.seek.buffer, ...action.commits],
          nextEnd: action.nextEnd,
        },
        retry: null,
      };
    case 'seek/end':
      if (state.status !== 'ready') return state;
      return settleSeek(state, action.error ?? null);
    default:
      return assertNever(action);
  }
}

function pageOptions(signal: AbortSignal, dispatch: Dispatch<Action>) {
  return {
    signal,
    onRetry: (notice: RetryNotice) => {
      if (!signal.aborted) dispatch({ type: 'retry', notice });
    },
  };
}

const LOADING: Extract<RawState, { status: 'loading' }> = {
  status: 'loading',
  pendingAttempts: 0,
  retry: null,
};

export function useGraphData({
  owner,
  repo,
  mode,
  refreshKey,
  onRefreshFailed,
}: UseGraphDataArgs): UseGraphDataResult {
  const [raw, dispatch] = useReducer(reducer, IDLE);

  const client = useMemo(() => createGithubNetworkClient(), []);

  // Depending on `raw` directly is avoided: loadMore would be recreated on every loadingMore
  // toggle and restart the subscriber's auto-load effect in a loop.
  const rawRef = useRef(raw);
  const onRefreshFailedRef = useRef(onRefreshFailed);
  useEffect(() => {
    rawRef.current = raw;
    onRefreshFailedRef.current = onRefreshFailed;
  }, [raw, onRefreshFailed]);

  const loadedFor = useRef<string | null>(null);
  const generation = useRef(0);
  const seekRun = useRef(0);
  const pagesAbort = useRef(new AbortController());

  const meta = raw.status === 'ready' ? raw.meta : null;
  const rawCommits = raw.status === 'ready' ? raw.rawCommits : null;
  const view = useMemo<GraphView | null>(() => {
    if (!meta || !rawCommits) return null;
    return transformNetwork(
      { meta, commits: rawCommits },
      { mode, inputOwner: owner, inputRepo: repo },
    );
  }, [meta, rawCommits, mode, owner, repo]);

  const request = useMemo(() => ({ owner, repo, refreshKey }), [owner, repo, refreshKey]);

  useEffect(() => {
    generation.current += 1;
    const abort = new AbortController();
    pagesAbort.current = abort;
    const { owner: targetOwner, repo: targetRepo } = request;
    if (!targetOwner || !targetRepo) {
      loadedFor.current = null;
      dispatch({ type: 'reset' });
      return undefined;
    }
    const target = `${targetOwner}/${targetRepo}`;
    const refreshing = rawRef.current.status === 'ready' && loadedFor.current === target;
    let cancelled = false;
    dispatch({ type: refreshing ? 'refresh/start' : 'init/start' });
    client
      .fetchInitialPage(targetOwner, targetRepo, {
        signal: abort.signal,
        onPending: (attempt) => {
          if (!cancelled) dispatch({ type: 'pending', attempt });
        },
        onRetry: (notice) => {
          if (!cancelled) dispatch({ type: 'retry', notice });
        },
      })
      .then(({ meta: loadedMeta, commits, nextEnd }) => {
        if (cancelled) return;
        loadedFor.current = target;
        dispatch({ type: 'init/success', meta: loadedMeta, rawCommits: commits, nextEnd });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const info = toGraphError(err, t('error_unknown_body'));
        trackEvent('graph_error', { phase: 'init', kind: info.kind });
        if (refreshing) {
          dispatch({ type: 'refresh/error' });
          onRefreshFailedRef.current?.();
          return;
        }
        loadedFor.current = null;
        dispatch({ type: 'init/error', error: info });
      });
    return () => {
      cancelled = true;
      abort.abort();
    };
  }, [client, request]);

  const loadMore = useCallback(() => {
    const r = rawRef.current;
    if (r.status !== 'ready' || !r.hasMore || r.loadingMore || r.refreshing) return;
    const startedIn = generation.current;
    const { signal } = pagesAbort.current;
    dispatch({ type: 'older/start' });
    client
      .fetchOlderPage(owner, repo, r.meta, r.nextEnd, pageOptions(signal, dispatch))
      .then(({ commits, nextEnd }) => {
        if (generation.current !== startedIn) return;
        dispatch({ type: 'older/success', commits, nextEnd });
      })
      .catch((err: unknown) => {
        if (generation.current !== startedIn || signal.aborted) return;
        const info = toGraphError(err, t('error_unknown_body'));
        trackEvent('graph_error', { phase: 'older', kind: info.kind });
        dispatch({ type: 'older/error', error: info });
      });
  }, [client, owner, repo]);

  const seekTo = useCallback(
    (sha: string) => {
      const r = rawRef.current;
      if (r.status !== 'ready' || !r.hasMore || r.loadingMore || r.refreshing) return;
      const startedIn = generation.current;
      const run = ++seekRun.current;
      const { signal } = pagesAbort.current;
      const superseded = () => generation.current !== startedIn || seekRun.current !== run;
      dispatch({ type: 'seek/start' });

      void (async () => {
        let nextEnd = r.nextEnd;
        try {
          while (nextEnd > 0) {
            const ends: number[] = [];
            for (
              let end = nextEnd;
              end > 0 && ends.length < SEEK_CONCURRENCY;
              end -= CHUNK_PAGE_SIZE
            ) {
              ends.push(end);
            }
            const pages = await Promise.all(
              ends.map((end) =>
                client.fetchOlderPage(owner, repo, r.meta, end, pageOptions(signal, dispatch)),
              ),
            );
            if (superseded()) return;
            const commits = pages.flatMap((p) => p.commits);
            nextEnd = Math.min(...pages.map((p) => p.nextEnd));
            dispatch({ type: 'seek/progress', commits, nextEnd });
            if (commits.some((c) => c.id === sha)) break;
          }
          dispatch({ type: 'seek/end' });
        } catch (err: unknown) {
          if (superseded()) return;
          const info = toGraphError(err, t('error_unknown_body'));
          trackEvent('graph_error', { phase: 'older', kind: info.kind });
          dispatch({ type: 'seek/end', error: info });
        }
      })();
    },
    [client, owner, repo],
  );

  const cancelSeek = useCallback(() => {
    if (rawRef.current.status !== 'ready' || !rawRef.current.seek) return;
    seekRun.current += 1;
    pagesAbort.current.abort();
    pagesAbort.current = new AbortController();
    dispatch({ type: 'seek/end' });
  }, []);

  const state = useMemo<GraphDataState>(() => {
    if (raw.status !== 'ready') return raw;
    return view ? { ...raw, view } : LOADING;
  }, [raw, view]);

  return { state, loadMore, seekTo, cancelSeek };
}
