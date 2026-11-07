import { asString, errorMessage, isObject } from '@/shared/errors';
import { t, tWith } from '@/shared/i18n';
import type {
  FetchedInitialPage,
  FetchedOlderPage,
  NetworkChunk,
  NetworkMeta,
  NetworkParent,
  NetworkRawCommit,
  RequestOptions,
  RetryKind,
} from './networkApi.types';
import {
  RETRY_AFTER_MAX_MS,
  RETRY_MAX_ATTEMPTS,
  backoffDelayMs,
  createCooldown,
  isTransientStatus,
  parseRetryAfterMs,
  sleep,
  type Cooldown,
} from './requestRetry';

type NetworkApiErrorKind =
  | 'network'
  | 'auth'
  | 'notFound'
  | 'rateLimit'
  | 'server'
  | 'empty'
  | 'shape'
  | 'http'
  | 'pending';

export type GraphErrorKind = NetworkApiErrorKind | 'unknown';

export class NetworkApiError extends Error {
  readonly kind: NetworkApiErrorKind;
  readonly status?: number;
  constructor(kind: NetworkApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'NetworkApiError';
    this.kind = kind;
    this.status = status;
  }
}

const GITHUB_ORIGIN = 'https://github.com';
export const CHUNK_PAGE_SIZE = 100;
const PENDING_MAX_ATTEMPTS = 19;
const PENDING_BASE_DELAY_MS = 400;
const PENDING_MAX_DELAY_MS = 4000;

function encodePath(value: string): string {
  return encodeURIComponent(value).replace(/%2F/gi, '/');
}

function pendingDelayMs(attempt: number): number {
  return Math.min(PENDING_BASE_DELAY_MS * 2 ** attempt, PENDING_MAX_DELAY_MS);
}

type Failure = { kind: RetryKind; error: NetworkApiError; retryAfterMs: number | null };

function rateLimitError(retryAfterMs: number | null, status?: number): NetworkApiError {
  const message =
    retryAfterMs === null
      ? t('error_ratelimit_body')
      : tWith('error_ratelimit_body_wait', {
          minutes: String(Math.max(1, Math.ceil(retryAfterMs / 60_000))),
        });
  return new NetworkApiError('rateLimit', message, status);
}

function serverError(status: number): NetworkApiError {
  return new NetworkApiError(
    'server',
    tWith('error_server_body', { status: String(status) }),
    status,
  );
}

function networkFailure(cause: unknown): Failure {
  return {
    kind: 'network',
    error: new NetworkApiError(
      'network',
      tWith('error_network_body', { cause: errorMessage(cause, 'unknown') }),
    ),
    retryAfterMs: null,
  };
}

function statusFailure(response: Response): Failure {
  const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'), Date.now());
  if (response.status === 429 || retryAfterMs !== null) {
    return {
      kind: 'rateLimit',
      error: rateLimitError(retryAfterMs, response.status),
      retryAfterMs,
    };
  }
  return { kind: 'server', error: serverError(response.status), retryAfterMs: null };
}

async function request(url: string, signal?: AbortSignal): Promise<Response | Failure> {
  try {
    return await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal,
    });
  } catch (cause) {
    if (signal?.aborted) throw signal.reason;
    return networkFailure(cause);
  }
}

async function waitOutCooldown(
  cooldown: Cooldown,
  attempt: number,
  { signal, onRetry }: RequestOptions,
): Promise<void> {
  for (let remaining = cooldown.remainingMs(); remaining > 0; remaining = cooldown.remainingMs()) {
    if (remaining > RETRY_AFTER_MAX_MS) throw rateLimitError(remaining);
    onRetry?.({
      kind: cooldown.kind(),
      attempt,
      maxAttempts: RETRY_MAX_ATTEMPTS,
      resumeAt: Date.now() + remaining,
    });
    await sleep(remaining, signal);
  }
}

async function fetchJson(
  url: string,
  cooldown: Cooldown,
  options: RequestOptions = {},
): Promise<unknown> {
  const { signal, onPending } = options;
  let pendingAttempts = 0;
  let retries = 0;
  for (;;) {
    await waitOutCooldown(cooldown, retries, options);
    const outcome = await request(url, signal);

    if (outcome instanceof Response) {
      if (outcome.status === 202) {
        pendingAttempts += 1;
        if (pendingAttempts >= PENDING_MAX_ATTEMPTS) {
          throw new NetworkApiError('pending', t('error_pending_body'), 202);
        }
        onPending?.(pendingAttempts);
        await sleep(pendingDelayMs(pendingAttempts - 1), signal);
        continue;
      }
      if (!isTransientStatus(outcome.status)) return handleFinalResponse(outcome);
    }

    const failure = outcome instanceof Response ? statusFailure(outcome) : outcome;
    retries += 1;
    const delay = Math.max(backoffDelayMs(retries), failure.retryAfterMs ?? 0);
    const giveUp = retries > RETRY_MAX_ATTEMPTS || delay > RETRY_AFTER_MAX_MS;
    if (failure.kind === 'rateLimit' || !giveUp) cooldown.extend(delay, failure.kind);
    if (giveUp) throw failure.error;
  }
}

async function handleFinalResponse(response: Response): Promise<unknown> {
  if (response.status === 401 || response.status === 403) {
    throw new NetworkApiError('auth', t('error_auth_body'), response.status);
  }
  if (response.status === 404) {
    throw new NetworkApiError('notFound', t('error_notfound_body'), response.status);
  }
  if (response.status >= 500) throw serverError(response.status);
  if (!response.ok) {
    throw new NetworkApiError(
      'http',
      tWith('error_http_body', { status: String(response.status) }),
      response.status,
    );
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    const bodyText = await response.text().catch(() => '');
    if (looksLikeEmptyRepoPage(bodyText)) {
      throw new NetworkApiError('empty', t('error_empty_body'));
    }
    throw new NetworkApiError('shape', t('error_shape_body'));
  }

  try {
    return await response.json();
  } catch (cause) {
    throw new NetworkApiError(
      'shape',
      tWith('error_shape_json_body', { cause: errorMessage(cause, 'unknown') }),
    );
  }
}

function looksLikeEmptyRepoPage(body: string): boolean {
  if (!body) return false;
  return body.includes('git remote add origin') && body.includes('git push -u origin');
}

function parseMeta(body: unknown): NetworkMeta {
  if (!isObject(body)) throw new NetworkApiError('shape', t('error_shape_body'));
  const { nethash, focus, dates, users } = body;
  if (typeof nethash !== 'string' || !nethash) {
    throw new NetworkApiError('shape', t('error_shape_body'));
  }
  if (typeof focus !== 'number') {
    throw new NetworkApiError('shape', t('error_shape_body'));
  }
  if (!Array.isArray(dates) || !Array.isArray(users)) {
    throw new NetworkApiError('shape', t('error_shape_body'));
  }
  return {
    nethash,
    focus,
    dates: dates.map((d) => String(d)),
    users: users.map((u) => parseUser(u)),
  };
}

function parseUser(value: unknown): NetworkMeta['users'][number] {
  if (!isObject(value)) {
    throw new NetworkApiError('shape', t('error_shape_body'));
  }
  const { name, repo, heads } = value;
  return {
    name: asString(name),
    repo: asString(repo),
    heads: Array.isArray(heads)
      ? heads
          .filter(isObject)
          .map((h) => ({
            name: asString(h.name),
            id: asString(h.id),
          }))
          .filter((h) => h.id.length > 0)
      : [],
  };
}

type IntermediateCommit = {
  id: string;
  author: number;
  time: number;
  space: number;
  message: string;
  date?: string;
  authorName?: string;
  login?: string;
  rawParents: unknown;
};

function parseChunk(body: unknown): NetworkChunk {
  if (!isObject(body)) throw new NetworkApiError('shape', t('error_shape_body'));
  const { commits } = body;
  if (!Array.isArray(commits)) {
    throw new NetworkApiError('shape', t('error_shape_body'));
  }
  const intermediate = commits.map((c) => parseCommitIntermediate(c));
  const resolved: NetworkRawCommit[] = intermediate.map((c) => ({
    id: c.id,
    author: c.author,
    time: c.time,
    space: c.space,
    message: c.message,
    date: c.date,
    authorName: c.authorName,
    login: c.login,
    parents: normalizeParents(c.rawParents, intermediate),
  }));
  return { commits: resolved };
}

function pickNumber(value: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = value[k];
    if (typeof v === 'number') return v;
  }
  return null;
}

function pickAuthorIndex(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (isObject(raw)) {
    if (typeof raw.id === 'number') return raw.id;
    if (typeof raw.index === 'number') return raw.index;
  }
  return 0;
}

function parseCommitIntermediate(value: unknown): IntermediateCommit {
  if (!isObject(value)) {
    throw new NetworkApiError('shape', t('error_shape_body'));
  }
  if (typeof value.id !== 'string' || !value.id) {
    throw new NetworkApiError('shape', t('error_shape_body'));
  }
  const space = pickNumber(value, ['space', 'x', 'lane', 'column']) ?? 0;
  const time = pickNumber(value, ['time']) ?? 0;
  return {
    id: value.id,
    author: pickAuthorIndex(value.author),
    time,
    space,
    message: asString(value.message),
    date: typeof value.date === 'string' ? value.date : undefined,
    authorName: typeof value.author_name === 'string' ? value.author_name : undefined,
    login: typeof value.login === 'string' ? value.login : undefined,
    rawParents: value.parents,
  };
}

function normalizeParents(raw: unknown, commits: IntermediateCommit[]): NetworkParent[] {
  if (!Array.isArray(raw)) return [];
  const out: NetworkParent[] = [];
  for (const p of raw) {
    if (typeof p === 'string' && p) {
      out.push({ sha: p, space: 0 });
      continue;
    }
    if (Array.isArray(p) && p.length >= 1) {
      const head = p[0];
      const space =
        p.length >= 3 && typeof p[2] === 'number' ? p[2] : typeof p[1] === 'number' ? p[1] : 0;
      if (typeof head === 'string' && head) {
        out.push({ sha: head, space });
        continue;
      }
      if (typeof head === 'number') {
        const target = commits[head];
        if (target) {
          out.push({ sha: target.id, space });
          continue;
        }
      }
    }
    if (isObject(p)) {
      const sha = typeof p.sha === 'string' ? p.sha : typeof p.id === 'string' ? p.id : '';
      if (sha) {
        out.push({ sha, space: typeof p.space === 'number' ? p.space : 0 });
        continue;
      }
    }
  }
  return out;
}

type GithubNetworkClient = {
  fetchMeta(owner: string, repo: string, options?: RequestOptions): Promise<NetworkMeta>;
  fetchChunk(
    owner: string,
    repo: string,
    nethash: string,
    start: number,
    end: number,
    options?: RequestOptions,
  ): Promise<NetworkChunk>;
  fetchInitialPage(
    owner: string,
    repo: string,
    opts?: RequestOptions & { pageSize?: number },
  ): Promise<FetchedInitialPage>;
  fetchOlderPage(
    owner: string,
    repo: string,
    meta: NetworkMeta,
    nextEnd: number,
    opts?: RequestOptions & { pageSize?: number },
  ): Promise<FetchedOlderPage>;
};

export function createGithubNetworkClient(): GithubNetworkClient {
  const cooldown = createCooldown();
  return {
    async fetchMeta(owner, repo, options) {
      const url = `${GITHUB_ORIGIN}/${encodePath(owner)}/${encodePath(repo)}/network/meta`;
      const body = await fetchJson(url, cooldown, options);
      return parseMeta(body);
    },

    async fetchChunk(owner, repo, nethash, start, end, options) {
      const params = new URLSearchParams({
        nethash,
        start: String(start),
        end: String(end),
      });
      const url = `${GITHUB_ORIGIN}/${encodePath(owner)}/${encodePath(
        repo,
      )}/network/chunk?${params.toString()}`;
      const body = await fetchJson(url, cooldown, options);
      return parseChunk(body);
    },

    async fetchInitialPage(owner, repo, opts) {
      const pageSize = opts?.pageSize ?? CHUNK_PAGE_SIZE;
      const meta = await this.fetchMeta(owner, repo, opts);
      const totalCount = meta.dates.length;
      const end = totalCount;
      const start = Math.max(0, end - pageSize);
      const chunk =
        end > start
          ? await this.fetchChunk(owner, repo, meta.nethash, start, end - 1, opts)
          : { commits: [] };
      const commits = [...chunk.commits].reverse();
      return { meta, commits, nextEnd: start };
    },

    async fetchOlderPage(owner, repo, meta, nextEnd, opts) {
      const pageSize = opts?.pageSize ?? CHUNK_PAGE_SIZE;
      if (nextEnd <= 0) {
        return { commits: [], nextEnd: 0 };
      }
      const end = nextEnd;
      const start = Math.max(0, end - pageSize);
      const chunk = await this.fetchChunk(owner, repo, meta.nethash, start, end - 1, opts);
      const commits = [...chunk.commits].reverse();
      return { commits, nextEnd: start };
    },
  };
}

export type GraphErrorInfo = { kind: GraphErrorKind; message: string };

export function toGraphError(err: unknown, fallbackMessage: string): GraphErrorInfo {
  if (err instanceof NetworkApiError) {
    return { kind: err.kind, message: err.message };
  }
  return { kind: 'unknown', message: errorMessage(err, fallbackMessage) };
}
