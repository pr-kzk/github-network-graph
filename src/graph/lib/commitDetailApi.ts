import { asNumber, asString, isObject } from '@/shared/errors';
import {
  forgetMissing,
  isKnownMissing,
  loadCachedCommitDetail,
  rememberMissing,
  storeCommitDetail,
} from './commitDetailCache';
import {
  errorFromResponse,
  isCommitDetailError,
  makeError,
  MAX_LISTED_FILES,
  type CommitDetailError,
  type CommitDetailExtra,
  type CommitDetailFile,
} from './commitDetailTypes';
import { fetchCommitDetailViaWeb } from './commitDetailWeb';

type FetchCommitDetailArgs = {
  owner: string;
  repo: string;
  authorOwner?: string;
  authorRepo?: string;
  sha: string;
  signal?: AbortSignal;
  skipMissingCache?: boolean;
};

type RepoRef = { owner: string; repo: string };

const API_ORIGIN = 'https://api.github.com';

// フォーク網は git オブジェクトを共有するため、フォークのコミットも本家 URL で引ける。
// author のフォークを先に試す案は、ほぼ毎回 404 を 1 回余分に消費するので採らない。
function candidateRepos(args: FetchCommitDetailArgs): RepoRef[] {
  const primary = { owner: args.owner, repo: args.repo };
  if (!args.authorOwner || !args.authorRepo) return [primary];
  if (args.authorOwner === args.owner && args.authorRepo === args.repo) return [primary];
  return [primary, { owner: args.authorOwner, repo: args.authorRepo }];
}

const FALLBACK_KINDS: ReadonlySet<CommitDetailError['kind']> = new Set([
  'network',
  'rateLimit',
  'http',
  'shape',
]);

async function fetchFromRepo({ owner, repo }: RepoRef, sha: string): Promise<CommitDetailExtra> {
  try {
    return await fetchCommitDetailViaWeb(owner, repo, sha);
  } catch (err) {
    // notFound / auth を API で再試行しないのは、結果が変わらず無認証枠 (60/h) を浪費するだけのため。
    if (!isCommitDetailError(err) || !FALLBACK_KINDS.has(err.kind)) throw err;
    return fetchViaApi(owner, repo, sha);
  }
}

const inFlight = new Map<string, Promise<CommitDetailExtra>>();

// 共有する取得はどの呼び出し元の signal にも結びつけない。片方の中断で、同じ SHA を
// 待つ他方まで失敗させないため。中断した呼び出し元は結果を受け取らないだけにする。
export function fetchCommitDetail(args: FetchCommitDetailArgs): Promise<CommitDetailExtra> {
  const { signal } = args;
  if (signal?.aborted) return Promise.reject(abortError());

  const key = `${args.owner}/${args.repo}@${args.sha}|${args.authorOwner ?? ''}/${args.authorRepo ?? ''}|${
    args.skipMissingCache ? 'fresh' : 'cached'
  }`;
  let shared = inFlight.get(key);
  if (!shared) {
    shared = resolveCommitDetail(args).finally(() => inFlight.delete(key));
    inFlight.set(key, shared);
  }
  return signal ? raceWithAbort(shared, signal) : shared;
}

function abortError(): DOMException {
  return new DOMException('Aborted', 'AbortError');
}

function raceWithAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

async function resolveCommitDetail(args: FetchCommitDetailArgs): Promise<CommitDetailExtra> {
  const cacheKey = { owner: args.owner, repo: args.repo, sha: args.sha };
  const cached = await loadCachedCommitDetail(cacheKey);
  if (cached) return cached;

  let notFound = makeError('notFound', 404);
  for (const candidate of candidateRepos(args)) {
    const candidateKey = { ...candidate, sha: args.sha };
    if (args.skipMissingCache) forgetMissing(candidateKey);
    if (isKnownMissing(candidateKey)) continue;
    try {
      const result = await fetchFromRepo(candidate, args.sha);
      await storeCommitDetail(cacheKey, result);
      return result;
    } catch (err) {
      if (!isCommitDetailError(err) || err.kind !== 'notFound') throw err;
      rememberMissing(candidateKey);
      notFound = err;
    }
  }
  throw notFound;
}

async function fetchViaApi(owner: string, repo: string, sha: string): Promise<CommitDetailExtra> {
  const url = `${API_ORIGIN}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
    repo,
  )}/commits/${encodeURIComponent(sha)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      credentials: 'omit',
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store',
    });
  } catch {
    throw makeError('network');
  }

  const failure = errorFromResponse(response);
  if (failure) throw failure;

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw makeError('shape');
  }
  return parseDetail(body);
}

function parseDetail(body: unknown): CommitDetailExtra {
  if (!isObject(body)) throw makeError('shape');
  const stats = isObject(body.stats) ? body.stats : {};
  const filesRaw = Array.isArray(body.files) ? body.files : [];
  const files: CommitDetailFile[] = filesRaw
    .filter(isObject)
    .map((f) => ({
      filename: asString(f.filename),
      status: asString(f.status, 'changed'),
      additions: asNumber(f.additions),
      deletions: asNumber(f.deletions),
      changes: asNumber(f.changes),
      previousFilename: typeof f.previous_filename === 'string' ? f.previous_filename : undefined,
    }))
    .filter((f) => f.filename.length > 0);

  return {
    additions: asNumber(stats.additions),
    deletions: asNumber(stats.deletions),
    total: asNumber(stats.total),
    files,
    truncated: files.length >= MAX_LISTED_FILES,
  };
}
