import type { GraphMode } from '@/shared/storage';
import type { FetchedNetwork, NetworkRawCommit } from './networkApi.types';
import { shortSha } from './shortSha';
import type {
  GraphBranch,
  GraphForkBranches,
  GraphView,
  ViewCommit,
  ViewEdge,
  ViewRef,
} from './transform.types';

type TransformOptions = {
  mode: GraphMode;
  inputOwner?: string;
  inputRepo?: string;
};

const RESOLVE_DEPTH_LIMIT = 200;

function firstLine(message: string): string {
  const idx = message.indexOf('\n');
  return idx < 0 ? message : message.slice(0, idx);
}

function resolveToVisibleAncestor(
  startSha: string,
  commitsBySha: Map<string, NetworkRawCommit>,
  visibleShaSet: Set<string>,
  resolvedCache: Map<string, string | null>,
): string | null {
  if (visibleShaSet.has(startSha)) return startSha;
  const cached = resolvedCache.get(startSha);
  if (cached !== undefined) return cached;
  const resolved = searchVisibleAncestor(startSha, commitsBySha, visibleShaSet);
  resolvedCache.set(startSha, resolved);
  return resolved;
}

function searchVisibleAncestor(
  startSha: string,
  commitsBySha: Map<string, NetworkRawCommit>,
  visibleShaSet: Set<string>,
): string | null {
  const seen = new Set<string>();
  const stack: Array<{ sha: string; depth: number }> = [{ sha: startSha, depth: 0 }];
  for (let item = stack.pop(); item; item = stack.pop()) {
    const { sha, depth } = item;
    if (seen.has(sha)) continue;
    seen.add(sha);
    if (depth > RESOLVE_DEPTH_LIMIT) continue;
    const c = commitsBySha.get(sha);
    if (!c) continue;
    for (const p of c.parents) {
      if (visibleShaSet.has(p.sha)) return p.sha;
      stack.push({ sha: p.sha, depth: depth + 1 });
    }
  }
  return null;
}

function computeFocusReachable(
  focusHeadShas: string[],
  commitsBySha: Map<string, NetworkRawCommit>,
): Set<string> {
  const reached = new Set<string>();
  const stack = [...focusHeadShas];
  for (let sha = stack.pop(); sha !== undefined; sha = stack.pop()) {
    if (reached.has(sha)) continue;
    const c = commitsBySha.get(sha);
    if (!c) continue;
    reached.add(sha);
    for (const p of c.parents) stack.push(p.sha);
  }
  return reached;
}

export function transformNetwork(data: FetchedNetwork, options: TransformOptions): GraphView {
  const { meta, commits } = data;

  const focusUser =
    (options.inputOwner && options.inputRepo
      ? meta.users.find((u) => u.name === options.inputOwner && u.repo === options.inputRepo)
      : undefined) ??
    meta.users[meta.focus] ??
    meta.users[0];
  const focusIndex = focusUser ? meta.users.indexOf(focusUser) : -1;

  const commitsBySha = new Map<string, NetworkRawCommit>();
  for (const c of commits) commitsBySha.set(c.id, c);

  const focusHeadShas = (focusUser?.heads ?? []).map((h) => h.id);
  const focusReachable = computeFocusReachable(focusHeadShas, commitsBySha);

  const useReachability = focusReachable.size > 0;
  const isVisible: (c: NetworkRawCommit) => boolean =
    options.mode === 'network'
      ? () => true
      : useReachability
        ? (c) => focusReachable.has(c.id)
        : (c) => c.author === focusIndex;

  const visibleShaSet = new Set<string>();
  for (const c of commits) if (isVisible(c)) visibleShaSet.add(c.id);

  const refsByCommit = new Map<string, ViewRef[]>();
  for (const user of meta.users) {
    const isFocusOwner = user === focusUser;
    if (options.mode === 'repo-only' && !isFocusOwner) continue;
    for (const head of user.heads) {
      const list = refsByCommit.get(head.id) ?? [];
      list.push({
        name: head.name,
        isFocus: isFocusOwner,
        ownerName: user.name,
      });
      refsByCommit.set(head.id, list);
    }
  }

  const visibleCommits: NetworkRawCommit[] = commits.filter(isVisible);

  const spaceToLane = new Map<number, number>();
  for (const c of visibleCommits) {
    if (!spaceToLane.has(c.space)) spaceToLane.set(c.space, spaceToLane.size);
  }

  const resolvedCache = new Map<string, string | null>();
  const viewCommits: ViewCommit[] = visibleCommits.map((c, row) => {
    const user = meta.users[c.author];
    const lane = spaceToLane.get(c.space) ?? 0;
    const authorDisplay = c.authorName || c.login || user?.name || '';

    const resolvedParents: string[] = [];
    const seenParent = new Set<string>();
    for (const p of c.parents) {
      const resolved = resolveToVisibleAncestor(p.sha, commitsBySha, visibleShaSet, resolvedCache);
      if (resolved && !seenParent.has(resolved) && resolved !== c.id) {
        resolvedParents.push(resolved);
        seenParent.add(resolved);
      }
    }

    return {
      sha: c.id,
      shortSha: shortSha(c.id),
      row,
      lane,
      time: c.time,
      dateLabel: c.date ?? '',
      authorName: authorDisplay,
      authorLogin: c.login || user?.name || '',
      authorRepo: user?.repo ?? '',
      message: c.message,
      subject: firstLine(c.message),
      parents: resolvedParents,
      refs: refsByCommit.get(c.id) ?? [],
    };
  });

  const shaToRow = new Map<string, ViewCommit>();
  for (const v of viewCommits) shaToRow.set(v.sha, v);

  const edges: ViewEdge[] = [];
  for (const vc of viewCommits) {
    vc.parents.forEach((parentSha, parentIdx) => {
      const parent = shaToRow.get(parentSha);
      if (!parent) return;
      edges.push({
        fromSha: vc.sha,
        toSha: parent.sha,
        fromRow: vc.row,
        toRow: parent.row,
        fromLane: vc.lane,
        toLane: parent.lane,
        isMerge: parentIdx > 0,
      });
    });
  }

  const branches: GraphBranch[] = (focusUser?.heads ?? [])
    .map((h) => ({ name: h.name, sha: h.id }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const forkBranches: GraphForkBranches[] =
    options.mode === 'network'
      ? meta.users
          .filter((user) => user !== focusUser && user.heads.length > 0)
          .map((user) => ({
            owner: user.name,
            branches: user.heads
              .map((h) => ({ name: h.name, sha: h.id }))
              .sort((a, b) => a.name.localeCompare(b.name)),
          }))
          .sort((a, b) => a.owner.localeCompare(b.owner))
      : [];

  return {
    commits: viewCommits,
    edges,
    laneCount: spaceToLane.size,
    branches,
    forkBranches,
  };
}
