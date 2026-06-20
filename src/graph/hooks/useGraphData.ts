import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { t } from '@/shared/i18n';
import type { GraphMode } from '@/shared/storage';
import { trackEvent } from '@/shared/telemetry';
import { NetworkApiError, createGithubNetworkClient, toGraphError } from '../lib/networkApi';
import type { NetworkMeta, NetworkRawCommit } from '../lib/networkApi.types';
import { transformNetwork } from '../lib/transform';
import type { GraphView } from '../lib/transform.types';

type OlderError = { kind: NetworkApiError['kind'] | 'unknown'; message: string };

type RawState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'error';
      kind: NetworkApiError['kind'] | 'unknown';
      message: string;
    }
  | {
      status: 'ready';
      meta: NetworkMeta;
      rawCommits: NetworkRawCommit[];
      nextEnd: number;
      hasMore: boolean;
      loadingMore: boolean;
      olderError: OlderError | null;
    };

export type GraphDataState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'error';
      kind: NetworkApiError['kind'] | 'unknown';
      message: string;
    }
  | {
      status: 'ready';
      view: GraphView;
      meta: NetworkMeta;
      rawCommits: NetworkRawCommit[];
      nextEnd: number;
      hasMore: boolean;
      loadingMore: boolean;
      olderError: OlderError | null;
    };

export type UseGraphDataResult = {
  state: GraphDataState;
  loadMore: () => void;
};

export type UseGraphDataArgs = {
  owner: string;
  repo: string;
  mode: GraphMode;
  pageSize?: number;
  refreshKey?: number;
};

type Action =
  | { type: 'reset' }
  | { type: 'init/start' }
  | {
      type: 'init/success';
      meta: NetworkMeta;
      rawCommits: NetworkRawCommit[];
      nextEnd: number;
    }
  | { type: 'init/error'; kind: NetworkApiError['kind'] | 'unknown'; message: string }
  | { type: 'older/start' }
  | {
      type: 'older/success';
      commits: NetworkRawCommit[];
      nextEnd: number;
    }
  | { type: 'older/error'; kind: NetworkApiError['kind'] | 'unknown'; message: string };

function reducer(state: RawState, action: Action): RawState {
  switch (action.type) {
    case 'reset':
      return { status: 'idle' };
    case 'init/start':
      return { status: 'loading' };
    case 'init/success':
      return {
        status: 'ready',
        meta: action.meta,
        rawCommits: action.rawCommits,
        nextEnd: action.nextEnd,
        hasMore: action.nextEnd > 0,
        loadingMore: false,
        olderError: null,
      };
    case 'init/error':
      return { status: 'error', kind: action.kind, message: action.message };
    case 'older/start':
      if (state.status !== 'ready') return state;
      return { ...state, loadingMore: true, olderError: null };
    case 'older/success':
      if (state.status !== 'ready') return state;
      // 新→古順の累積に古い側を append。
      return {
        ...state,
        rawCommits: [...state.rawCommits, ...action.commits],
        nextEnd: action.nextEnd,
        hasMore: action.nextEnd > 0,
        loadingMore: false,
        olderError: null,
      };
    case 'older/error':
      if (state.status !== 'ready') return state;
      return {
        ...state,
        loadingMore: false,
        olderError: { kind: action.kind, message: action.message },
      };
  }
}

const INITIAL_STATE: RawState = { status: 'idle' };

export function useGraphData({
  owner,
  repo,
  mode,
  pageSize = 100,
  refreshKey = 0,
}: UseGraphDataArgs): UseGraphDataResult {
  const [raw, dispatch] = useReducer(reducer, INITIAL_STATE);

  const client = useMemo(() => createGithubNetworkClient(), []);

  // loadMore 側で raw を直接 deps に取ると loadingMore トグルだけで関数が
  // 再生成され、購読側 (GraphList の自動ロード effect) が連鎖再起動する。
  // ref に最新値を持たせて参照同一性を切り離す。
  const rawRef = useRef(raw);
  useEffect(() => {
    rawRef.current = raw;
  }, [raw]);

  // view は raw + mode から derive。これにより mode 変更だけのときは再 fetch せず
  // transform のみが再評価される (累積 rawCommits を流し直す)。
  // deps を meta / rawCommits に限定し、loadingMore トグルでは再 transform しない。
  const meta = raw.status === 'ready' ? raw.meta : null;
  const rawCommits = raw.status === 'ready' ? raw.rawCommits : null;
  const view = useMemo<GraphView | null>(() => {
    if (!meta || !rawCommits) return null;
    return transformNetwork(
      { meta, commits: rawCommits },
      { mode, inputOwner: owner, inputRepo: repo },
    );
  }, [meta, rawCommits, mode, owner, repo]);

  // initial fetch: owner/repo/refreshKey/pageSize 変更で発火。mode は deps から除外。
  useEffect(() => {
    if (!owner || !repo) {
      dispatch({ type: 'reset' });
      return;
    }
    let cancelled = false;
    dispatch({ type: 'init/start' });
    client
      .fetchInitialPage(owner, repo, { pageSize })
      .then(({ meta, commits, nextEnd }) => {
        if (cancelled) return;
        dispatch({ type: 'init/success', meta, rawCommits: commits, nextEnd });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const info = toGraphError(err, t('error_unknown_body'));
        trackEvent('graph_error', { phase: 'init', kind: info.kind });
        dispatch({ type: 'init/error', kind: info.kind, message: info.message });
      });
    return () => {
      cancelled = true;
    };
  }, [client, owner, repo, refreshKey, pageSize]);

  const loadMore = useCallback(() => {
    const r = rawRef.current;
    if (r.status !== 'ready' || !r.hasMore || r.loadingMore) return;
    dispatch({ type: 'older/start' });
    client
      .fetchOlderPage(owner, repo, r.meta, r.nextEnd, { pageSize })
      .then(({ commits, nextEnd }) => {
        dispatch({ type: 'older/success', commits, nextEnd });
      })
      .catch((err: unknown) => {
        const info = toGraphError(err, t('error_unknown_body'));
        trackEvent('graph_error', { phase: 'older', kind: info.kind });
        dispatch({ type: 'older/error', kind: info.kind, message: info.message });
      });
  }, [client, owner, repo, pageSize]);

  const state: GraphDataState = useMemo(() => {
    if (raw.status === 'ready' && view !== null) {
      return { ...raw, view };
    }
    return raw as GraphDataState;
  }, [raw, view]);

  return { state, loadMore };
}
