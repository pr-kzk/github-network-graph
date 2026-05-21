// 単一コミットの詳細 (stats / files) を遅延取得する。
//
// GitHub の公開 API `/repos/{owner}/{repo}/commits/{sha}` を未認証で叩くため、
// 公開リポジトリかつ 60 req/hour (未認証 IP 単位) の制約下で動作する。
// 同一 SHA は SHA キーでメモリキャッシュし、画面再選択時の重複取得を抑える。
//
// フォーク含むモードでは、コミットが本家リポにアクセス可能とは限らないため、
// authorLogin/authorRepo が指定されていればそちらを優先で試し、404 のときに
// 入力 owner/repo へフォールバックする。
import { asNumber, asString, errorMessage, isObject } from '@/shared/errors';
import { t, tWith } from '@/shared/i18n';

export type CommitDetailFile = {
  filename: string;
  // GitHub API の status は added/modified/removed/renamed/copied/changed/unchanged。
  // 未知値も string として透過する。
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
  // GitHub API は files を 300 件で切り詰める。実際の変更ファイル数が
  // それを超える可能性は呼び出し側で「files.length」と stats から推定する。
  truncated: boolean;
};

export type CommitDetailError = {
  kind: 'network' | 'notFound' | 'rateLimit' | 'auth' | 'shape' | 'http';
  message: string;
  status?: number;
};

export type FetchCommitDetailArgs = {
  // 表示中の本家リポ (フォールバック用)
  owner: string;
  repo: string;
  // author の所属リポ (フォーク識別)。空なら owner/repo のみで取得を試す。
  authorOwner?: string;
  authorRepo?: string;
  sha: string;
  signal?: AbortSignal;
};

const API_ORIGIN = 'https://api.github.com';

const cache = new Map<string, CommitDetailExtra>();

function cacheKey(args: { owner: string; repo: string; sha: string }): string {
  return `${args.owner}/${args.repo}@${args.sha}`;
}

export function getCachedCommitDetail(args: {
  owner: string;
  repo: string;
  sha: string;
}): CommitDetailExtra | null {
  return cache.get(cacheKey(args)) ?? null;
}

export function clearCommitDetailCache(): void {
  cache.clear();
}

export async function fetchCommitDetail(
  args: FetchCommitDetailArgs,
): Promise<CommitDetailExtra> {
  const candidates: Array<{ owner: string; repo: string }> = [];
  if (args.authorOwner && args.authorRepo) {
    candidates.push({ owner: args.authorOwner, repo: args.authorRepo });
  }
  // 本家がフォールバック (author のリポと一致する場合は重複しない)
  if (
    !candidates.some((c) => c.owner === args.owner && c.repo === args.repo)
  ) {
    candidates.push({ owner: args.owner, repo: args.repo });
  }

  let lastError: CommitDetailError | null = null;
  for (const cand of candidates) {
    const key = cacheKey({ owner: cand.owner, repo: cand.repo, sha: args.sha });
    const cached = cache.get(key);
    if (cached) return cached;
    try {
      const result = await fetchOne(cand.owner, cand.repo, args.sha, args.signal);
      cache.set(key, result);
      return result;
    } catch (err) {
      if (isCommitDetailError(err)) {
        lastError = err;
        // 404 のときだけ次の候補へ。それ以外 (auth / rate limit / network) は即時失敗。
        if (err.kind === 'notFound') continue;
        throw err;
      }
      throw err;
    }
  }
  if (lastError) throw lastError;
  // candidates 0 件は想定外
  throw makeError('shape', 'no candidate repo to query');
}

function isCommitDetailError(e: unknown): e is CommitDetailError {
  return isObject(e) && typeof e.kind === 'string' && typeof e.message === 'string';
}

function makeError(
  kind: CommitDetailError['kind'],
  message: string,
  status?: number,
): CommitDetailError {
  return { kind, message, status };
}

async function fetchOne(
  owner: string,
  repo: string,
  sha: string,
  signal?: AbortSignal,
): Promise<CommitDetailExtra> {
  const url = `${API_ORIGIN}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
    repo,
  )}/commits/${encodeURIComponent(sha)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      // api.github.com は Cookie 認証ではなく Token 認証なので credentials は不要。
      credentials: 'omit',
      headers: { Accept: 'application/vnd.github+json' },
      signal,
      cache: 'no-store',
    });
  } catch (cause) {
    throw makeError(
      'network',
      tWith('error_network_body', { cause: errorMessage(cause, 'unknown') }),
    );
  }

  if (response.status === 404) {
    throw makeError('notFound', t('error_commit_notfound_body'), 404);
  }
  if (response.status === 403) {
    // 403 のうち rate limit は header で判別。
    const remaining = response.headers.get('x-ratelimit-remaining');
    if (remaining === '0') {
      throw makeError('rateLimit', t('error_ratelimit_body'), 403);
    }
    throw makeError('auth', t('error_auth_denied_body'), 403);
  }
  if (response.status === 401) {
    throw makeError('auth', t('error_auth_required_body'), 401);
  }
  if (!response.ok) {
    throw makeError(
      'http',
      tWith('error_http_body', { status: String(response.status) }),
      response.status,
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (cause) {
    throw makeError('shape', `JSON parse failed: ${errorMessage(cause, '')}`);
  }
  return parseDetail(body);
}

function parseDetail(body: unknown): CommitDetailExtra {
  if (!isObject(body)) throw makeError('shape', 'response is not an object');
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
    // GitHub は files を 300 件で打ち切る。`files.length === 300` を簡易判定にする。
    truncated: files.length >= 300,
  };
}
