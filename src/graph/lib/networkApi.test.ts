import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { NetworkApiError, createGithubNetworkClient } from './networkApi';
import type { RetryNotice } from './networkApi.types';
import { RETRY_AFTER_MAX_MS, RETRY_MAX_ATTEMPTS } from './requestRetry';

const META_BODY = {
  nethash: 'abc123',
  focus: 0,
  dates: Array.from({ length: 10 }, () => '2026-05-19'),
  name: 'repo',
  users: [
    {
      name: 'owner',
      repo: 'repo',
      heads: [{ name: 'main', id: 'sha-head' }],
    },
  ],
};

const CHUNK_BODY_PAGE1 = {
  commits: [
    { id: 'sha1', author: 0, time: 100, space: 0, parents: [[1, 0]], message: 'one' },
    { id: 'sha2', author: 0, time: 99, space: 0, parents: [], message: 'two' },
  ],
};

function jsonResponse(body: unknown, init?: { status?: number; contentType?: string }) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { 'content-type': init?.contentType ?? 'application/json; charset=utf-8' },
  });
}

let fetchMock: Mock<typeof fetch>;

beforeEach(() => {
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createGithubNetworkClient', () => {
  it('fetches /network/meta with credentials and Accept header', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(META_BODY));
    const client = createGithubNetworkClient();
    const meta = await client.fetchMeta('owner', 'repo');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://github.com/owner/repo/network/meta');
    expect(init).toMatchObject({
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    expect(meta.nethash).toBe('abc123');
    expect(meta.users[0]?.heads[0]?.name).toBe('main');
  });

  it('fetches /network/chunk with nethash, start, end', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(CHUNK_BODY_PAGE1));
    const client = createGithubNetworkClient();
    const chunk = await client.fetchChunk('owner', 'repo', 'hash', 0, 100);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://github.com/owner/repo/network/chunk?nethash=hash&start=0&end=100');
    expect(chunk.commits).toHaveLength(2);
    expect(chunk.commits[0]?.parents).toEqual([{ sha: 'sha2', space: 0 }]);
  });

  it('normalizes parents in index form ([commitIndex, space]) to {sha, space}', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        commits: [
          { id: 'sha-a', author: 0, time: 1, space: 0, parents: [[1, 0]], message: 'a' },
          { id: 'sha-b', author: 0, time: 0, space: 0, parents: [], message: 'b' },
        ],
      }),
    );
    const client = createGithubNetworkClient();
    const chunk = await client.fetchChunk('o', 'r', 'h', 0, 100);
    expect(chunk.commits[0]?.parents).toEqual([{ sha: 'sha-b', space: 0 }]);
  });

  it('normalizes parents in [sha, space] form', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        commits: [
          { id: 'sha-a', author: 0, time: 1, space: 0, parents: [['sha-b', 1]], message: 'a' },
        ],
      }),
    );
    const client = createGithubNetworkClient();
    const chunk = await client.fetchChunk('o', 'r', 'h', 0, 100);
    expect(chunk.commits[0]?.parents).toEqual([{ sha: 'sha-b', space: 1 }]);
  });

  it('normalizes parents from bare SHA strings', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        commits: [{ id: 'sha-a', author: 0, time: 1, space: 0, parents: ['sha-b'], message: 'a' }],
      }),
    );
    const client = createGithubNetworkClient();
    const chunk = await client.fetchChunk('o', 'r', 'h', 0, 100);
    expect(chunk.commits[0]?.parents).toEqual([{ sha: 'sha-b', space: 0 }]);
  });

  it('fetchAll stops early when a chunk returns fewer than pageSize commits', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(META_BODY))
      .mockResolvedValueOnce(jsonResponse(CHUNK_BODY_PAGE1));

    const client = createGithubNetworkClient();
    const result = await client.fetchAll('owner', 'repo', { maxCommits: 500, pageSize: 100 });
    expect(result.commits).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('fetchAll pages through multiple chunks when each returns a full page', async () => {
    const fullPage = (offset: number) => ({
      commits: Array.from({ length: 2 }, (_v, i) => ({
        id: `sha-${offset + i}`,
        author: 0,
        time: 100 - (offset + i),
        space: 0,
        parents: [],
        message: 'm',
      })),
    });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(META_BODY))
      .mockResolvedValueOnce(jsonResponse(fullPage(0)))
      .mockResolvedValueOnce(jsonResponse({ commits: [] }));

    const client = createGithubNetworkClient();
    const result = await client.fetchAll('owner', 'repo', { maxCommits: 10, pageSize: 2 });
    expect(result.commits).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('throws NetworkApiError on 401', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }));
    const client = createGithubNetworkClient();
    await expect(client.fetchMeta('owner', 'repo')).rejects.toMatchObject({
      name: 'NetworkApiError',
      kind: 'auth',
      status: 401,
    });
  });

  it('throws NetworkApiError on 404', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 404 }));
    const client = createGithubNetworkClient();
    await expect(client.fetchMeta('owner', 'repo')).rejects.toMatchObject({
      kind: 'notFound',
      status: 404,
    });
  });

  it('reports malformed JSON structure with a localized message', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ focus: 0, dates: [], users: [] }));
    const err = await createGithubNetworkClient()
      .fetchMeta('owner', 'repo')
      .catch((e) => e);
    expect(err.kind).toBe('shape');
    expect(err.message).not.toMatch(/[ぁ-ん]/);
  });

  it('throws shape error when response is HTML without empty-repo markers', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('<!DOCTYPE html><html><body>something else</body></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }),
    );
    const client = createGithubNetworkClient();
    const err = await client.fetchMeta('owner', 'repo').catch((e) => e);
    expect(err).toBeInstanceOf(NetworkApiError);
    expect(err.kind).toBe('shape');
    expect(err.message).not.toMatch(/内部\s*API/);
  });

  it('throws empty error when HTML response is GitHub empty-repo placeholder', async () => {
    const html = `<!DOCTYPE html><html><body>
      <h2>Quick setup</h2>
      <pre>git remote add origin https://github.com/owner/repo.git
git branch -M main
git push -u origin main</pre>
    </body></html>`;
    fetchMock.mockResolvedValueOnce(
      new Response(html, { status: 200, headers: { 'content-type': 'text/html' } }),
    );
    const client = createGithubNetworkClient();
    await expect(client.fetchMeta('owner', 'repo')).rejects.toMatchObject({ kind: 'empty' });
  });

  it('throws shape error when JSON is missing required field', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ focus: 0, dates: [], users: [] }));
    const client = createGithubNetworkClient();
    await expect(client.fetchMeta('owner', 'repo')).rejects.toBeInstanceOf(NetworkApiError);
  });

  it('retries 202 (still computing) responses and returns parsed body on eventual 200', async () => {
    vi.useFakeTimers();
    try {
      fetchMock
        .mockResolvedValueOnce(new Response('', { status: 202 }))
        .mockResolvedValueOnce(new Response('', { status: 202 }))
        .mockResolvedValueOnce(jsonResponse(META_BODY));

      const client = createGithubNetworkClient();
      const promise = client.fetchMeta('owner', 'repo');
      await vi.runAllTimersAsync();
      const meta = await promise;

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(meta.nethash).toBe('abc123');
    } finally {
      vi.useRealTimers();
    }
  });

  it('reports each 202 retry so callers can show progress', async () => {
    vi.useFakeTimers();
    try {
      fetchMock
        .mockResolvedValueOnce(new Response('', { status: 202 }))
        .mockResolvedValueOnce(new Response('', { status: 202 }))
        .mockResolvedValueOnce(jsonResponse(META_BODY));
      const attempts: number[] = [];

      const promise = createGithubNetworkClient().fetchMeta('owner', 'repo', {
        onPending: (a) => attempts.push(a),
      });
      await vi.runAllTimersAsync();
      await promise;

      expect(attempts).toEqual([1, 2]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('throws pending NetworkApiError when 202 persists past the retry limit', async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockResolvedValue(new Response('', { status: 202 }));

      const client = createGithubNetworkClient();
      const promise = client.fetchMeta('owner', 'repo').catch((e) => e);
      await vi.runAllTimersAsync();
      const err = await promise;

      expect(err).toBeInstanceOf(NetworkApiError);
      expect(err.kind).toBe('pending');
      expect(err.status).toBe(202);
    } finally {
      vi.useRealTimers();
    }
  });

  it('encodes special characters in owner/repo segments', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(META_BODY));
    const client = createGithubNetworkClient();
    await client.fetchMeta('foo bar', 'repo+x');
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://github.com/foo%20bar/repo%2Bx/network/meta');
  });

  it('fetchInitialPage requests [totalCount - pageSize, totalCount) and returns nextEnd', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(META_BODY))
      .mockResolvedValueOnce(jsonResponse(CHUNK_BODY_PAGE1));

    const client = createGithubNetworkClient();
    const result = await client.fetchInitialPage('owner', 'repo', { pageSize: 4 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://github.com/owner/repo/network/chunk?nethash=abc123&start=6&end=9',
    );
    expect(result.totalCount).toBe(10);
    expect(result.nextEnd).toBe(6);
    expect(result.commits).toHaveLength(2);
    expect(result.commits.map((c) => c.id)).toEqual(['sha2', 'sha1']);
  });

  it('fetchInitialPage handles totalCount smaller than pageSize (start = 0)', async () => {
    const meta = {
      ...META_BODY,
      dates: Array.from({ length: 3 }, () => '2026-05-19'),
    };
    fetchMock
      .mockResolvedValueOnce(jsonResponse(meta))
      .mockResolvedValueOnce(jsonResponse(CHUNK_BODY_PAGE1));

    const client = createGithubNetworkClient();
    const result = await client.fetchInitialPage('owner', 'repo', { pageSize: 10 });

    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://github.com/owner/repo/network/chunk?nethash=abc123&start=0&end=2',
    );
    expect(result.nextEnd).toBe(0);
    expect(result.totalCount).toBe(3);
  });

  it('fetchOlderPage requests [max(0, nextEnd - pageSize), nextEnd) and sets exhausted on reaching 0', async () => {
    const meta = { ...META_BODY };
    fetchMock.mockResolvedValueOnce(jsonResponse(CHUNK_BODY_PAGE1));

    const client = createGithubNetworkClient();
    const result = await client.fetchOlderPage('owner', 'repo', meta, 5, { pageSize: 10 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://github.com/owner/repo/network/chunk?nethash=abc123&start=0&end=4',
    );
    expect(result.nextEnd).toBe(0);
    expect(result.exhausted).toBe(true);
    expect(result.commits.map((c) => c.id)).toEqual(['sha2', 'sha1']);
  });

  it('fetchOlderPage early-returns when nextEnd <= 0 (no fetch)', async () => {
    const meta = { ...META_BODY };
    const client = createGithubNetworkClient();
    const result = await client.fetchOlderPage('owner', 'repo', meta, 0, { pageSize: 10 });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.commits).toEqual([]);
    expect(result.nextEnd).toBe(0);
    expect(result.exhausted).toBe(true);
  });

  it('fetchOlderPage sets exhausted=false when more pages remain', async () => {
    const meta = { ...META_BODY };
    fetchMock.mockResolvedValueOnce(jsonResponse(CHUNK_BODY_PAGE1));

    const client = createGithubNetworkClient();
    const result = await client.fetchOlderPage('owner', 'repo', meta, 100, { pageSize: 10 });

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://github.com/owner/repo/network/chunk?nethash=abc123&start=90&end=99',
    );
    expect(result.nextEnd).toBe(90);
    expect(result.exhausted).toBe(false);
  });

  it('does not double-fetch the boundary commit across initial + older pages (end is inclusive)', async () => {
    const inclusiveChunk = (input: Parameters<typeof fetch>[0]) => {
      const u = new URL(new Request(input).url);
      if (u.pathname.endsWith('/network/meta')) {
        return jsonResponse({ ...META_BODY, dates: Array.from({ length: 4 }, () => 'd') });
      }
      const start = Number(u.searchParams.get('start'));
      const end = Number(u.searchParams.get('end'));
      const commits = [];
      for (let i = start; i <= end; i++) {
        commits.push({ id: `sha-${i}`, author: 0, time: i, space: 0, parents: [], message: 'm' });
      }
      return jsonResponse({ commits });
    };
    fetchMock.mockImplementation((url) => Promise.resolve(inclusiveChunk(url)));

    const client = createGithubNetworkClient();
    const initial = await client.fetchInitialPage('owner', 'repo', { pageSize: 2 });
    const older = await client.fetchOlderPage('owner', 'repo', initial.meta, initial.nextEnd, {
      pageSize: 2,
    });

    const initialIds = initial.commits.map((c) => c.id);
    const olderIds = older.commits.map((c) => c.id);
    expect(initialIds).toEqual(['sha-3', 'sha-2']);
    expect(olderIds).toEqual(['sha-1', 'sha-0']);
    expect(initialIds.filter((id) => olderIds.includes(id))).toEqual([]);
    expect(older.nextEnd).toBe(0);
    expect(older.exhausted).toBe(true);
  });
});

describe('transient failure handling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const throttled = (retryAfter?: string) =>
    new Response('', {
      status: 429,
      headers: retryAfter === undefined ? {} : { 'retry-after': retryAfter },
    });

  it('retries a network failure and returns the data once the connection recovers', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse(META_BODY));

    const promise = createGithubNetworkClient().fetchMeta('owner', 'repo');
    await vi.runAllTimersAsync();

    expect((await promise).nethash).toBe('abc123');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([429, 502, 503, 504])('retries HTTP %i and succeeds afterwards', async (status) => {
    fetchMock
      .mockResolvedValueOnce(new Response('', { status }))
      .mockResolvedValueOnce(jsonResponse(META_BODY));

    const promise = createGithubNetworkClient().fetchMeta('owner', 'repo');
    await vi.runAllTimersAsync();

    expect((await promise).nethash).toBe('abc123');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('waits longer between each retry', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const result = createGithubNetworkClient()
      .fetchMeta('owner', 'repo')
      .catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await vi.runAllTimersAsync();
    await result;
  });

  it('gives up on a persistent network failure with a network error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const result = createGithubNetworkClient()
      .fetchMeta('owner', 'repo')
      .catch((e: unknown) => e);
    await vi.runAllTimersAsync();

    expect(await result).toMatchObject({ kind: 'network' });
    expect(fetchMock).toHaveBeenCalledTimes(RETRY_MAX_ATTEMPTS + 1);
  });

  it('gives up on persistent throttling with a rateLimit error', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(throttled()));

    const result = createGithubNetworkClient()
      .fetchMeta('owner', 'repo')
      .catch((e: unknown) => e);
    await vi.runAllTimersAsync();

    expect(await result).toMatchObject({ kind: 'rateLimit', status: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(RETRY_MAX_ATTEMPTS + 1);
  });

  it('gives up on a persistent 503 with a server error', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response('', { status: 503 })));

    const result = createGithubNetworkClient()
      .fetchMeta('owner', 'repo')
      .catch((e: unknown) => e);
    await vi.runAllTimersAsync();

    expect(await result).toMatchObject({ kind: 'server', status: 503 });
  });

  it('reports a plain 500 as a server error without retrying', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 500 }));

    await expect(createGithubNetworkClient().fetchMeta('owner', 'repo')).rejects.toMatchObject({
      kind: 'server',
      status: 500,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry client errors', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 400 }));

    await expect(createGithubNetworkClient().fetchMeta('owner', 'repo')).rejects.toMatchObject({
      kind: 'http',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('waits for Retry-After given in seconds before retrying', async () => {
    fetchMock.mockResolvedValueOnce(throttled('7')).mockResolvedValueOnce(jsonResponse(META_BODY));

    const promise = createGithubNetworkClient().fetchMeta('owner', 'repo');
    await vi.advanceTimersByTimeAsync(6999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await promise;
  });

  it('waits for Retry-After given as an HTTP date before retrying', async () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    fetchMock
      .mockResolvedValueOnce(throttled('Thu, 01 Jan 2026 00:00:09 GMT'))
      .mockResolvedValueOnce(jsonResponse(META_BODY));

    const promise = createGithubNetworkClient().fetchMeta('owner', 'repo');
    await vi.advanceTimersByTimeAsync(8999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await promise;
  });

  it('does not wait out a Retry-After longer than the cap and tells the user how long to wait', async () => {
    const tooLong = String((RETRY_AFTER_MAX_MS / 1000) * 20);
    fetchMock.mockImplementation(() => Promise.resolve(throttled(tooLong)));

    const err = await createGithubNetworkClient()
      .fetchMeta('owner', 'repo')
      .catch((e: unknown) => e);

    expect(err).toMatchObject({
      kind: 'rateLimit',
      message: expect.stringContaining('10'),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('makes later requests of the same client wait out a shared cooldown', async () => {
    fetchMock
      .mockResolvedValueOnce(throttled('10'))
      .mockImplementation(() => Promise.resolve(jsonResponse(META_BODY)));
    const client = createGithubNetworkClient();

    const first = client.fetchMeta('owner', 'repo');
    await vi.advanceTimersByTimeAsync(0);
    const second = client.fetchMeta('owner', 'other');
    await vi.advanceTimersByTimeAsync(9999);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await Promise.all([first, second]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('refuses immediately while a cooldown longer than the cap is running', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(throttled('3600')));
    const client = createGithubNetworkClient();
    await client.fetchMeta('owner', 'repo').catch(() => undefined);
    fetchMock.mockClear();

    await expect(client.fetchMeta('owner', 'repo')).rejects.toMatchObject({ kind: 'rateLimit' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('announces each retry with its attempt number and resume time', async () => {
    const start = new Date('2026-01-01T00:00:00Z').getTime();
    vi.setSystemTime(start);
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(jsonResponse(META_BODY));
    const notices: RetryNotice[] = [];

    const promise = createGithubNetworkClient().fetchMeta('owner', 'repo', {
      onRetry: (notice) => notices.push(notice),
    });
    await vi.runAllTimersAsync();
    await promise;

    expect(notices).toEqual([
      { kind: 'network', attempt: 1, maxAttempts: RETRY_MAX_ATTEMPTS, resumeAt: start + 1000 },
      { kind: 'server', attempt: 2, maxAttempts: RETRY_MAX_ATTEMPTS, resumeAt: start + 3000 },
    ]);
  });

  it('stops retrying when the request is aborted while waiting', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const controller = new AbortController();

    const result = createGithubNetworkClient()
      .fetchMeta('owner', 'repo', { signal: controller.signal })
      .catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    await vi.runAllTimersAsync();

    expect(await result).not.toBeInstanceOf(NetworkApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not report an aborted fetch as a network error', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation((_url, init) => {
      controller.abort();
      return Promise.reject(init?.signal?.reason);
    });

    const err = await createGithubNetworkClient()
      .fetchMeta('owner', 'repo', { signal: controller.signal })
      .catch((e: unknown) => e);

    expect(err).not.toBeInstanceOf(NetworkApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
