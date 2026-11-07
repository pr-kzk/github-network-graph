import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { GraphMode } from '@/shared/storage';
import { createGithubNetworkClient } from '../lib/networkApi';
import { createGraphTransformer } from '../lib/graphTransformer';
import type { GraphView } from '../lib/transform.types';
import { graphDataReducer, IDLE, LOADING, type GraphDataState } from './graphDataReducer';
import { pageOptions, reportGraphError, retryDispatcher } from './graphDataRequests';
import { usePageSession } from './usePageSession';
import { useSeek } from './useSeek';

export type { GraphDataState } from './graphDataReducer';

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

export function useGraphData({
  owner,
  repo,
  mode,
  refreshKey,
  onRefreshFailed,
}: UseGraphDataArgs): UseGraphDataResult {
  const [raw, dispatch] = useReducer(graphDataReducer, IDLE);

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
  const session = usePageSession();

  const transform = useMemo(() => createGraphTransformer(), []);
  const meta = raw.status === 'ready' ? raw.meta : null;
  const rawCommits = raw.status === 'ready' ? raw.rawCommits : null;
  const view = useMemo<GraphView | null>(() => {
    if (!meta || !rawCommits) return null;
    return transform({ meta, commits: rawCommits }, { mode, inputOwner: owner, inputRepo: repo });
  }, [transform, meta, rawCommits, mode, owner, repo]);

  const request = useMemo(() => ({ owner, repo, refreshKey }), [owner, repo, refreshKey]);

  useEffect(() => {
    const abort = session.begin();
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
        onRetry: retryDispatcher(dispatch, () => cancelled),
      })
      .then(({ meta: loadedMeta, commits, nextEnd }) => {
        if (cancelled) return;
        loadedFor.current = target;
        dispatch({ type: 'init/success', meta: loadedMeta, rawCommits: commits, nextEnd });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const info = reportGraphError(err, 'init');
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
  }, [client, request, session]);

  const loadMore = useCallback(() => {
    const r = rawRef.current;
    if (r.status !== 'ready' || !r.hasMore || r.loadingMore || r.refreshing) return;
    const startedIn = session.generation();
    const signal = session.signal();
    dispatch({ type: 'older/start' });
    client
      .fetchOlderPage(owner, repo, r.meta, r.nextEnd, pageOptions(signal, dispatch))
      .then(({ commits, nextEnd }) => {
        if (session.generation() !== startedIn) return;
        dispatch({ type: 'older/success', commits, nextEnd });
      })
      .catch((err: unknown) => {
        if (session.generation() !== startedIn || signal.aborted) return;
        dispatch({ type: 'older/error', error: reportGraphError(err, 'older') });
      });
  }, [client, owner, repo, session]);

  const { seekTo, cancelSeek } = useSeek({ client, owner, repo, rawRef, session, dispatch });

  const state = useMemo<GraphDataState>(() => {
    if (raw.status !== 'ready') return raw;
    return view ? { ...raw, view } : LOADING;
  }, [raw, view]);

  return { state, loadMore, seekTo, cancelSeek };
}
