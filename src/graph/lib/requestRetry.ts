import type { RetryKind } from './networkApi.types';

export const RETRY_MAX_ATTEMPTS = 3;
export const RETRY_AFTER_MAX_MS = 30_000;
const RETRY_BASE_DELAY_MS = 1000;
const TRANSIENT_STATUSES: ReadonlySet<number> = new Set([429, 502, 503, 504]);

export function isTransientStatus(status: number): boolean {
  return TRANSIENT_STATUSES.has(status);
}

export function backoffDelayMs(retry: number): number {
  return RETRY_BASE_DELAY_MS * 2 ** (retry - 1);
}

export function parseRetryAfterMs(header: string | null, now: number): number | null {
  const value = header?.trim();
  if (!value) return null;
  if (/^\d+$/.test(value)) return Number(value) * 1000;
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - now);
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export type Cooldown = {
  remainingMs(): number;
  kind(): RetryKind;
  extend(ms: number, kind: RetryKind): void;
};

export function createCooldown(now: () => number = Date.now): Cooldown {
  let until = 0;
  let cause: RetryKind = 'rateLimit';
  return {
    remainingMs: () => Math.max(0, until - now()),
    kind: () => cause,
    extend(ms, kind) {
      if (now() + ms <= until) return;
      until = now() + ms;
      cause = kind;
    },
  };
}
