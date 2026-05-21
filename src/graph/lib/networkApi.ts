import { asString, errorMessage, isObject } from '@/shared/errors';
import { t, tWith } from '@/shared/i18n';
import type {
  FetchedInitialPage,
  FetchedNetwork,
  FetchedOlderPage,
  NetworkChunk,
  NetworkMeta,
  NetworkParent,
  NetworkRawCommit,
} from './networkApi.types';

export type NetworkApiErrorKind =
  | 'network'
  | 'auth'
  | 'notFound'
  | 'empty'
  | 'shape'
  | 'http'
  | 'pending';

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
const CHUNK_PAGE_SIZE = 100;
const DEFAULT_MAX_COMMITS = 500;
const PENDING_MAX_ATTEMPTS = 8;
const PENDING_BASE_DELAY_MS = 400;
const PENDING_MAX_DELAY_MS = 4000;

function encodePath(value: string): string {
  return encodeURIComponent(value).replace(/%2F/gi, '/');
}

function pendingDelayMs(attempt: number): number {
  return Math.min(PENDING_BASE_DELAY_MS * 2 ** attempt, PENDING_MAX_DELAY_MS);
}

async function fetchJson(url: string): Promise<unknown> {
  let attempt = 0;
  // GitHub の /network/* は、データが未計算のとき 202 + 空ボディを返してバックグラウンド
  // 計算をキューする。生成完了 (200) までバックオフでリトライ。
  for (;;) {
    let response: Response;
    try {
      response = await fetch(url, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
    } catch (cause) {
      throw new NetworkApiError(
        'network',
        tWith('error_network_body', { cause: errorMessage(cause, 'unknown') }),
      );
    }

    if (response.status === 202) {
      attempt += 1;
      if (attempt >= PENDING_MAX_ATTEMPTS) {
        throw new NetworkApiError('pending', t('error_pending_body'), 202);
      }
      await new Promise((resolve) => setTimeout(resolve, pendingDelayMs(attempt - 1)));
      continue;
    }

    return handleFinalResponse(response);
  }
}

async function handleFinalResponse(response: Response): Promise<unknown> {
  if (response.status === 401 || response.status === 403) {
    throw new NetworkApiError('auth', t('error_auth_body'), response.status);
  }
  if (response.status === 404) {
    throw new NetworkApiError('notFound', t('error_notfound_body'), response.status);
  }
  if (!response.ok) {
    throw new NetworkApiError(
      'http',
      tWith('error_http_body', { status: String(response.status) }),
      response.status,
    );
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    // GitHub がコミットグラフ用 JSON ではなく HTML を返したケース。
    // 一番多い原因は「まだ 1 件もコミットが無いリポジトリ」で、その場合は
    // セットアップ手順のページが返ってくる。body を読んでその目印を確認する。
    let bodyText = '';
    try {
      bodyText = await response.text();
    } catch {
      // 読めなくても致命ではない。汎用エラーに落とす。
    }
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

// 空リポジトリのプレースホルダ HTML を見分ける。GitHub のセットアップ手順は
// `git remote add origin` と `git push -u origin` を必ず案内するため、両方が
// 揃っているケースに限ってマッチさせる (誤検知を避ける)。
function looksLikeEmptyRepoPage(body: string): boolean {
  if (!body) return false;
  return body.includes('git remote add origin') && body.includes('git push -u origin');
}

function parseMeta(body: unknown): NetworkMeta {
  if (!isObject(body)) throw new NetworkApiError('shape', 'meta レスポンスがオブジェクトではありません。');
  const { nethash, focus, dates, name, users } = body;
  if (typeof nethash !== 'string' || !nethash) {
    throw new NetworkApiError('shape', 'meta.nethash が見つかりません。');
  }
  if (typeof focus !== 'number') {
    throw new NetworkApiError('shape', 'meta.focus が数値ではありません。');
  }
  if (!Array.isArray(dates) || !Array.isArray(users)) {
    throw new NetworkApiError('shape', 'meta.dates / meta.users が配列ではありません。');
  }
  return {
    nethash,
    focus,
    dates: dates.map((d) => String(d)),
    name: asString(name),
    users: users.map((u) => parseUser(u)),
  };
}

function parseUser(value: unknown): NetworkMeta['users'][number] {
  if (!isObject(value)) {
    throw new NetworkApiError('shape', 'users[] の要素がオブジェクトではありません。');
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
  if (!isObject(body)) throw new NetworkApiError('shape', 'chunk レスポンスがオブジェクトではありません。');
  const { commits } = body;
  if (!Array.isArray(commits)) {
    throw new NetworkApiError('shape', 'chunk.commits が配列ではありません。');
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

// GitHub の chunk レスポンスでは、commit ごとの「レーン位置」がリポジトリの版や
// 状況によって `space` / `x` / `lane` / `column` のいずれかで来る可能性がある。
// `author` も数値インデックス / `{ id: number }` / `{ name: string }` の可能性がある。
// 既知のキーを横断して値を拾い、無ければ 0 fallback とする。
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
    throw new NetworkApiError('shape', 'commits[] の要素がオブジェクトではありません。');
  }
  if (typeof value.id !== 'string' || !value.id) {
    throw new NetworkApiError('shape', 'commit.id が文字列ではありません。');
  }
  const space = pickNumber(value, ['space', 'x', 'lane', 'column']) ?? 0;
  // GitHub の time は「リポジトリ全体での順序番号」(0, 1, 2, ...) であって UNIX 秒ではない。
  // 実際の日付は別途 `date` 文字列フィールドで来る。
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

// GitHub の chunk レスポンスにおける parents の形式は版によって揺れる可能性があるため、
// 既知の派生形を吸収して `{sha, space}` に正規化する。
//  - "sha"                         (文字列のみ)
//  - ["sha", space]                ([SHA, space])
//  - [commitIndex, space]          ([参照 index, space])
//  - { id: "sha", space }          (オブジェクト)
//  - { sha: "sha", space }
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
      // 既知の派生形:
      //   [sha, space]                       (2 要素)
      //   [sha, globalCommitIndex, space]    (3 要素 - GitHub の現行 numpy 等)
      //   [commitIndex, space]               (2 要素 / index 形式)
      const space =
        p.length >= 3 && typeof p[2] === 'number'
          ? p[2]
          : typeof p[1] === 'number'
            ? p[1]
            : 0;
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

export type GithubNetworkClient = {
  fetchMeta(owner: string, repo: string): Promise<NetworkMeta>;
  fetchChunk(
    owner: string,
    repo: string,
    nethash: string,
    start: number,
    end: number,
  ): Promise<NetworkChunk>;
  fetchAll(
    owner: string,
    repo: string,
    opts?: { maxCommits?: number; pageSize?: number },
  ): Promise<FetchedNetwork>;
  fetchInitialPage(
    owner: string,
    repo: string,
    opts?: { pageSize?: number },
  ): Promise<FetchedInitialPage>;
  fetchOlderPage(
    owner: string,
    repo: string,
    meta: NetworkMeta,
    nextEnd: number,
    opts?: { pageSize?: number },
  ): Promise<FetchedOlderPage>;
};

export function createGithubNetworkClient(): GithubNetworkClient {
  return {
    async fetchMeta(owner, repo) {
      const url = `${GITHUB_ORIGIN}/${encodePath(owner)}/${encodePath(repo)}/network/meta`;
      const body = await fetchJson(url);
      return parseMeta(body);
    },

    async fetchChunk(owner, repo, nethash, start, end) {
      const params = new URLSearchParams({
        nethash,
        start: String(start),
        end: String(end),
      });
      const url = `${GITHUB_ORIGIN}/${encodePath(owner)}/${encodePath(
        repo,
      )}/network/chunk?${params.toString()}`;
      const body = await fetchJson(url);
      return parseChunk(body);
    },

    async fetchAll(owner, repo, opts) {
      const maxCommits = opts?.maxCommits ?? DEFAULT_MAX_COMMITS;
      const pageSize = opts?.pageSize ?? CHUNK_PAGE_SIZE;

      const meta = await this.fetchMeta(owner, repo);

      // GitHub の time は「リポジトリ全体での順序番号 (0 = 最古)」。
      // start/end は同じ index 空間で、start=0 だと最古から取れる。
      // ユーザーは「最新」を見たいので、meta.dates.length を total count とみなして
      // 後ろから取得する。
      const totalCount = meta.dates.length || maxCommits;
      const desiredEnd = totalCount;
      const desiredStart = Math.max(0, desiredEnd - maxCommits);

      const collected: NetworkRawCommit[] = [];
      let start = desiredStart;
      while (start < desiredEnd && collected.length < maxCommits) {
        const end = Math.min(start + pageSize, desiredEnd);
        const chunk = await this.fetchChunk(owner, repo, meta.nethash, start, end);
        if (chunk.commits.length === 0) break;
        collected.push(...chunk.commits);
        if (chunk.commits.length < end - start) break;
        start = end;
      }

      // チャンクは time 昇順 (古い順) で返ってくる。最新を上段に表示するため逆順にする。
      collected.reverse();

      return { meta, commits: collected };
    },

    async fetchInitialPage(owner, repo, opts) {
      const pageSize = opts?.pageSize ?? CHUNK_PAGE_SIZE;
      const meta = await this.fetchMeta(owner, repo);
      const totalCount = meta.dates.length;
      const end = totalCount;
      const start = Math.max(0, end - pageSize);
      const chunk =
        end > start ? await this.fetchChunk(owner, repo, meta.nethash, start, end) : { commits: [] };
      // チャンクは time 昇順 (古→新) で来るので、画面表示順 (新→古) に逆順化。
      const commits = [...chunk.commits].reverse();
      return { meta, commits, nextEnd: start, totalCount };
    },

    async fetchOlderPage(owner, repo, meta, nextEnd, opts) {
      const pageSize = opts?.pageSize ?? CHUNK_PAGE_SIZE;
      if (nextEnd <= 0) {
        return { commits: [], nextEnd: 0, exhausted: true };
      }
      const end = nextEnd;
      const start = Math.max(0, end - pageSize);
      const chunk = await this.fetchChunk(owner, repo, meta.nethash, start, end);
      const commits = [...chunk.commits].reverse();
      return { commits, nextEnd: start, exhausted: start === 0 };
    },
  };
}

// useGraphData などの呼び出し側で `(err as Error)?.message ?? '不明...'` 形を
// 散らかさないための小ヘルパ。NetworkApiError なら kind/message をそのまま、
// それ以外は kind: 'unknown' + fallback メッセージに揃える。
export type GraphErrorInfo = { kind: NetworkApiErrorKind | 'unknown'; message: string };

export function toGraphError(err: unknown, fallbackMessage: string): GraphErrorInfo {
  if (err instanceof NetworkApiError) {
    return { kind: err.kind, message: err.message };
  }
  return { kind: 'unknown', message: errorMessage(err, fallbackMessage) };
}
