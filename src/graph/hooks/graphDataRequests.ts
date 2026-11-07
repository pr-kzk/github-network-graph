import type { Dispatch } from 'react';
import { t } from '@/shared/i18n';
import { trackEvent } from '@/shared/telemetry';
import { toGraphError, type GraphErrorInfo } from '../lib/networkApi';
import type { RetryNotice } from '../lib/networkApi.types';
import type { GraphDataAction } from './graphDataReducer';

export function retryDispatcher(dispatch: Dispatch<GraphDataAction>, isStale: () => boolean) {
  return (notice: RetryNotice) => {
    if (!isStale()) dispatch({ type: 'retry', notice });
  };
}

export function pageOptions(signal: AbortSignal, dispatch: Dispatch<GraphDataAction>) {
  return { signal, onRetry: retryDispatcher(dispatch, () => signal.aborted) };
}

export function reportGraphError(err: unknown, phase: 'init' | 'older'): GraphErrorInfo {
  const info = toGraphError(err, t('error_unknown_body'));
  trackEvent('graph_error', { phase, kind: info.kind });
  return info;
}
