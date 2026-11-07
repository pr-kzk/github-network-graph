import { useCallback, useSyncExternalStore } from 'react';
import { tWith, type MessageKey } from '@/shared/i18n';
import type { RetryKind, RetryNotice } from '../lib/networkApi.types';

const TICK_MS = 1000;

const RETRY_KEYS: Record<RetryKind, MessageKey> = {
  rateLimit: 'graph_status_retry_ratelimit',
  network: 'graph_status_retry_network',
  server: 'graph_status_retry_server',
};

function currentSecond(): number {
  return Math.floor(Date.now() / TICK_MS) * TICK_MS;
}

export function useRetryMessage(notice: RetryNotice | null): string | null {
  const active = notice !== null;
  const subscribe = useCallback(
    (onTick: () => void) => {
      if (!active) return () => {};
      const timer = setInterval(onTick, TICK_MS);
      return () => clearInterval(timer);
    },
    [active],
  );
  const now = useSyncExternalStore(subscribe, currentSecond);

  if (!notice) return null;
  const seconds = Math.ceil((notice.resumeAt - now) / 1000);
  if (seconds <= 0) return null;
  if (notice.attempt === 0) {
    return tWith('graph_status_cooldown', { seconds: String(seconds) });
  }
  return tWith(RETRY_KEYS[notice.kind], {
    seconds: String(seconds),
    attempt: String(notice.attempt),
    max: String(notice.maxAttempts),
  });
}
