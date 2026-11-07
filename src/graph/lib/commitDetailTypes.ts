import { isObject } from '@/shared/errors';

export type CommitDetailFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  previousFilename?: string;
};

export type CommitDetailExtra = {
  additions: number;
  deletions: number;
  total: number;
  files: CommitDetailFile[];
  truncated: boolean;
};

export type CommitDetailError = {
  kind: CommitDetailErrorKind;
  status?: number;
  resetAt?: number;
};

export const MAX_LISTED_FILES = 300;

const ERROR_KINDS = ['network', 'notFound', 'rateLimit', 'auth', 'shape', 'http'] as const;

type CommitDetailErrorKind = (typeof ERROR_KINDS)[number];

export function makeError(
  kind: CommitDetailErrorKind,
  status?: number,
  resetAt?: number,
): CommitDetailError {
  return { kind, status, resetAt };
}

export async function fetchOrNetworkError(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw makeError('network');
  }
}

export function isCommitDetailError(e: unknown): e is CommitDetailError {
  return isObject(e) && typeof e.kind === 'string' && ERROR_KINDS.some((kind) => kind === e.kind);
}

function rateLimitResetAt(response: Response): number | undefined {
  const seconds = Number(response.headers.get('x-ratelimit-reset'));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined;
}

export function errorFromResponse(response: Response): CommitDetailError | null {
  const { status } = response;
  if (response.ok) return null;
  if (status === 404) return makeError('notFound', status);
  if (status === 401) return makeError('auth', status);
  if (status === 429) return makeError('rateLimit', status, rateLimitResetAt(response));
  if (status === 403) {
    const limited =
      response.headers.get('x-ratelimit-remaining') === '0' || response.headers.has('retry-after');
    return limited
      ? makeError('rateLimit', status, rateLimitResetAt(response))
      : makeError('auth', status);
  }
  return makeError('http', status);
}

export function summarize(files: CommitDetailFile[], truncated: boolean): CommitDetailExtra {
  const additions = files.reduce((sum, f) => sum + f.additions, 0);
  const deletions = files.reduce((sum, f) => sum + f.deletions, 0);
  return {
    additions,
    deletions,
    total: additions + deletions,
    files: files.slice(0, MAX_LISTED_FILES),
    truncated: truncated || files.length > MAX_LISTED_FILES,
  };
}
