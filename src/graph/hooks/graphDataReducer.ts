import { assertNever } from '@/shared/errors';
import type { GraphErrorInfo } from '../lib/networkApi';
import type { NetworkMeta, NetworkRawCommit, RetryNotice } from '../lib/networkApi.types';
import type { GraphView } from '../lib/transform.types';

export type LoadProgress = { pendingAttempts: number; retry: RetryNotice | null };

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
  progress: LoadProgress;
};

type ReadyRaw = { status: 'ready' } & ReadyFields;

export type RawState =
  | { status: 'idle' }
  | { status: 'loading'; progress: LoadProgress }
  | ({ status: 'error' } & GraphErrorInfo)
  | ReadyRaw;

export type GraphDataState = Exclude<RawState, ReadyRaw> | (ReadyRaw & { view: GraphView });

export type GraphDataAction =
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

const NO_PROGRESS: LoadProgress = { pendingAttempts: 0, retry: null };

export const IDLE: RawState = { status: 'idle' };

export const LOADING: Extract<RawState, { status: 'loading' }> = {
  status: 'loading',
  progress: NO_PROGRESS,
};

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
    progress: NO_PROGRESS,
  };
}

export function graphDataReducer(state: RawState, action: GraphDataAction): RawState {
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
        progress: NO_PROGRESS,
      };
    case 'pending':
      if (state.status === 'loading' || state.status === 'ready') {
        return { ...state, progress: { ...state.progress, pendingAttempts: action.attempt } };
      }
      return state;
    case 'retry':
      if (state.status === 'loading' || state.status === 'ready') {
        return { ...state, progress: { ...state.progress, retry: action.notice } };
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
        progress: NO_PROGRESS,
      };
    case 'init/error':
      return { status: 'error', ...action.error };
    case 'refresh/error':
      if (state.status !== 'ready') return state;
      return { ...state, refreshing: false, progress: NO_PROGRESS };
    case 'older/start':
      if (state.status !== 'ready') return state;
      return { ...state, loadingMore: true, olderError: null, progress: NO_PROGRESS };
    case 'older/success':
      if (state.status !== 'ready') return state;
      return {
        ...state,
        rawCommits: [...state.rawCommits, ...action.commits],
        nextEnd: action.nextEnd,
        hasMore: action.nextEnd > 0,
        loadingMore: false,
        olderError: null,
        progress: NO_PROGRESS,
      };
    case 'older/error':
      if (state.status !== 'ready') return state;
      return { ...state, loadingMore: false, olderError: action.error, progress: NO_PROGRESS };
    case 'seek/start':
      if (state.status !== 'ready') return state;
      return {
        ...state,
        loadingMore: true,
        olderError: null,
        seek: { buffer: [], nextEnd: state.nextEnd },
        progress: NO_PROGRESS,
      };
    case 'seek/progress':
      if (state.status !== 'ready' || !state.seek) return state;
      return {
        ...state,
        seek: {
          buffer: [...state.seek.buffer, ...action.commits],
          nextEnd: action.nextEnd,
        },
        progress: NO_PROGRESS,
      };
    case 'seek/end':
      if (state.status !== 'ready') return state;
      return settleSeek(state, action.error ?? null);
    default:
      return assertNever(action);
  }
}
