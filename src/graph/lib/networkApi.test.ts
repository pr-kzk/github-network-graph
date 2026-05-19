import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetworkApiError, createGithubNetworkClient } from './networkApi';

const META_BODY = {
  nethash: 'abc123',
  focus: 0,
  // fetchAll は `dates.length` を「コミット総数」と扱って後ろから取りに行くので、
  // テストでは余裕のある長さを与える。
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

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
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
    const [url, init] = fetchMock.mock.calls[0]!;
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
    const [url] = fetchMock.mock.calls[0]!;
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
        commits: [
          { id: 'sha-a', author: 0, time: 1, space: 0, parents: ['sha-b'], message: 'a' },
        ],
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
    // meta + 1 chunk (2 < 100 だったので追加 chunk は呼ばれない)
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
    // meta + chunk(0,2) full + chunk(2,4) empty = 3 calls
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
    // メッセージから「内部 API」表現が漏れていないこと。
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

  it('encodes special characters in owner/repo segments', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(META_BODY));
    const client = createGithubNetworkClient();
    await client.fetchMeta('foo bar', 'repo+x');
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://github.com/foo%20bar/repo%2Bx/network/meta');
  });

  it('fetchInitialPage requests [totalCount - pageSize, totalCount) and returns nextEnd', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(META_BODY)) // totalCount = 10
      .mockResolvedValueOnce(jsonResponse(CHUNK_BODY_PAGE1));

    const client = createGithubNetworkClient();
    const result = await client.fetchInitialPage('owner', 'repo', { pageSize: 4 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]![0]).toBe(
      'https://github.com/owner/repo/network/chunk?nethash=abc123&start=6&end=10',
    );
    expect(result.totalCount).toBe(10);
    expect(result.nextEnd).toBe(6);
    expect(result.commits).toHaveLength(2);
    // 新→古に並び替えられている: CHUNK_BODY_PAGE1 は [sha1, sha2] で来るが逆順化されて [sha2, sha1] に
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

    expect(fetchMock.mock.calls[1]![0]).toBe(
      'https://github.com/owner/repo/network/chunk?nethash=abc123&start=0&end=3',
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
    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://github.com/owner/repo/network/chunk?nethash=abc123&start=0&end=5',
    );
    expect(result.nextEnd).toBe(0);
    expect(result.exhausted).toBe(true);
    // 新→古順
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

    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://github.com/owner/repo/network/chunk?nethash=abc123&start=90&end=100',
    );
    expect(result.nextEnd).toBe(90);
    expect(result.exhausted).toBe(false);
  });
});
