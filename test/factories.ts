import type { GraphView, ViewCommit } from '@/graph/lib/transform.types';

export function makeCommit(sha: string, overrides: Partial<ViewCommit> = {}): ViewCommit {
  return {
    sha,
    shortSha: sha.slice(0, 7),
    row: 0,
    lane: 0,
    time: 0,
    dateLabel: '',
    authorName: '',
    authorLogin: '',
    authorRepo: '',
    message: '',
    subject: '',
    parents: [],
    refs: [],
    ...overrides,
  };
}

export function makeView(commits: ViewCommit[], overrides: Partial<GraphView> = {}): GraphView {
  return { commits, edges: [], laneCount: 1, branches: [], forkBranches: [], ...overrides };
}

export function jsonResponse(
  body: unknown,
  init?: { status?: number; contentType?: string },
): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { 'content-type': init?.contentType ?? 'application/json; charset=utf-8' },
  });
}
