import type { GraphDataState, LoadProgress } from '../hooks/graphDataReducer';

export const PENDING_NOTICE_ATTEMPTS = 3;

const NO_PROGRESS: LoadProgress = { pendingAttempts: 0, retry: null };

export type GraphScreen = {
  ready: Extract<GraphDataState, { status: 'ready' }> | null;
  loading: boolean;
  retry: LoadProgress['retry'];
  pendingNotice: boolean;
};

export function selectGraphScreen(state: GraphDataState): GraphScreen {
  const progress =
    state.status === 'loading' || state.status === 'ready' ? state.progress : NO_PROGRESS;
  return {
    ready: state.status === 'ready' ? state : null,
    loading: state.status === 'loading' || state.status === 'idle',
    retry: progress.retry,
    pendingNotice: progress.pendingAttempts >= PENDING_NOTICE_ATTEMPTS,
  };
}
