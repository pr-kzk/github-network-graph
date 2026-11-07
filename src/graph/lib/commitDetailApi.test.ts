import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse } from '../../../test/factories';
import { fetchCommitDetail } from './commitDetailApi';
import { resetCommitDetailMemoryCacheForTest } from './commitDetailCache';

const DIFF = ['diff --git a/a.ts b/a.ts', '@@ -1 +1,2 @@', ' x', '+y', ''].join('\n');

const API_BODY = {
  stats: { additions: 5, deletions: 2, total: 7 },
  files: [{ filename: 'api.ts', status: 'modified', additions: 5, deletions: 2, changes: 7 }],
};

function diffResponse(): Response {
  return new Response(DIFF, { status: 200, headers: { 'content-type': 'text/plain' } });
}

function status(code: number, headers?: Record<string, string>): Response {
  return new Response('', { status: code, headers });
}

function stubFetch(route: (url: string) => Response) {
  const fn = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (url) =>
    route(url),
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}

const base = { owner: 'o', repo: 'r', sha: 'abc' };

beforeEach(() => {
  resetCommitDetailMemoryCacheForTest();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchCommitDetail', () => {
  it('reads changed files from the cookie-authenticated github.com diff', async () => {
    const fetchMock = stubFetch(diffResponse);
    const result = await fetchCommitDetail(base);
    expect(result).toMatchObject({ additions: 1, deletions: 0, total: 1 });
    expect(result.files.map((f) => f.filename)).toEqual(['a.ts']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://github.com/o/r/commit/abc.diff');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: 'include' });
  });

  it('falls back to the public API when the web diff is unavailable', async () => {
    const fetchMock = stubFetch((url) =>
      url.startsWith('https://github.com/') ? status(500) : jsonResponse(API_BODY),
    );
    const result = await fetchCommitDetail(base);
    expect(result.files.map((f) => f.filename)).toEqual(['api.ts']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not spend API quota when the web says the commit is missing', async () => {
    const fetchMock = stubFetch(() => status(404));
    await expect(fetchCommitDetail(base)).rejects.toMatchObject({ kind: 'notFound' });
    expect(fetchMock.mock.calls.every(([url]) => url.startsWith('https://github.com/'))).toBe(true);
  });

  it('asks for sign-in when GitHub redirects the diff request to the login page', async () => {
    const loginPage = new Response('<html></html>', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    });
    Object.defineProperty(loginPage, 'redirected', { value: true });
    Object.defineProperty(loginPage, 'url', { value: 'https://github.com/login?return_to=x' });
    const fetchMock = stubFetch(() => loginPage);
    await expect(fetchCommitDetail(base)).rejects.toMatchObject({ kind: 'auth' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('queries the root repository first and the author fork only after a miss', async () => {
    const fetchMock = stubFetch((url) => (url.includes('/o/r/') ? status(404) : diffResponse()));
    await fetchCommitDetail({ ...base, authorOwner: 'fork', authorRepo: 'r' });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://github.com/o/r/commit/abc.diff',
      'https://github.com/fork/r/commit/abc.diff',
    ]);
  });

  it('asks the root repository only once when the author repo is the same', async () => {
    const fetchMock = stubFetch(diffResponse);
    await fetchCommitDetail({ ...base, authorOwner: 'o', authorRepo: 'r' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports a rate limit when both sources are throttled', async () => {
    stubFetch((url) =>
      url.startsWith('https://github.com/')
        ? status(429)
        : status(403, { 'x-ratelimit-remaining': '0' }),
    );
    await expect(fetchCommitDetail(base)).rejects.toMatchObject({ kind: 'rateLimit' });
  });

  it('reports a network failure when neither source is reachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    await expect(fetchCommitDetail(base)).rejects.toMatchObject({ kind: 'network' });
  });

  it('serves a repeated request from the cache without fetching again', async () => {
    const fetchMock = stubFetch(diffResponse);
    await fetchCommitDetail(base);
    await fetchCommitDetail(base);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('serves from the session store after the in-memory cache is gone', async () => {
    const fetchMock = stubFetch(diffResponse);
    await fetchCommitDetail(base);
    resetCommitDetailMemoryCacheForTest();
    const result = await fetchCommitDetail(base);
    expect(result.files.map((f) => f.filename)).toEqual(['a.ts']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a transient failure instead of remembering it', async () => {
    const fetchMock = stubFetch(() => status(500));
    await expect(fetchCommitDetail(base)).rejects.toBeDefined();
    fetchMock.mockClear();
    await expect(fetchCommitDetail(base)).rejects.toBeDefined();
    expect(fetchMock).toHaveBeenCalled();
  });

  it('shares one request between concurrent callers asking for the same commit', async () => {
    const fetchMock = stubFetch(diffResponse);
    const [first, second] = await Promise.all([fetchCommitDetail(base), fetchCommitDetail(base)]);
    expect(first).toEqual(second);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps serving a shared request to the remaining caller when one aborts', async () => {
    const fetchMock = stubFetch(diffResponse);
    const controller = new AbortController();
    const aborted = fetchCommitDetail({ ...base, signal: controller.signal });
    const kept = fetchCommitDetail(base);
    controller.abort();
    await expect(aborted).rejects.toMatchObject({ name: 'AbortError' });
    await expect(kept).resolves.toMatchObject({ total: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not ask GitHub again for a commit it just reported missing', async () => {
    const fetchMock = stubFetch(() => status(404));
    await expect(fetchCommitDetail(base)).rejects.toMatchObject({ kind: 'notFound' });
    fetchMock.mockClear();
    await expect(fetchCommitDetail(base)).rejects.toMatchObject({ kind: 'notFound' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('asks again for a missing commit when the user explicitly retries', async () => {
    const fetchMock = stubFetch(() => status(404));
    await expect(fetchCommitDetail(base)).rejects.toMatchObject({ kind: 'notFound' });
    fetchMock.mockClear();
    fetchMock.mockImplementation(async () => diffResponse());
    await expect(fetchCommitDetail({ ...base, skipMissingCache: true })).resolves.toMatchObject({
      total: 1,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('skips only the repository known to miss and still tries the author fork again', async () => {
    const fetchMock = stubFetch((url) => (url.includes('/o/r/') ? status(404) : status(502)));
    const fork = { ...base, authorOwner: 'fork', authorRepo: 'r' };
    await expect(fetchCommitDetail(fork)).rejects.toMatchObject({ kind: 'http' });
    fetchMock.mockClear();
    fetchMock.mockImplementation(async () => diffResponse());
    await fetchCommitDetail(fork);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://github.com/fork/r/commit/abc.diff',
    ]);
  });

  it('reports when the rate limit resets', async () => {
    stubFetch((url) =>
      url.startsWith('https://github.com/')
        ? status(429, { 'x-ratelimit-reset': '1800000000' })
        : status(403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1800000000' }),
    );
    await expect(fetchCommitDetail(base)).rejects.toMatchObject({
      kind: 'rateLimit',
      resetAt: 1_800_000_000_000,
    });
  });
});
