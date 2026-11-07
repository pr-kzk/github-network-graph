import type { FetchedNetwork, NetworkMeta, NetworkRawCommit } from './networkApi.types';
import {
  buildRefsByCommit,
  resolveFocus,
  toViewCommit,
  toViewEdge,
  transformNetwork,
  viewBranches,
  type TransformOptions,
} from './transform';
import type { GraphView, ViewCommit, ViewEdge } from './transform.types';

type GraphTransformer = (data: FetchedNetwork, options: TransformOptions) => GraphView;

type Session = {
  meta: NetworkMeta;
  owner: string | undefined;
  repo: string | undefined;
  commits: readonly NetworkRawCommit[];
  view: GraphView;
  rowBySha: Map<string, number>;
  spaceToLane: Map<number, number>;
  edgesByRow: ViewEdge[][];
  rowsWaitingOnParent: Map<string, number[]>;
  refsByCommit: ReturnType<typeof buildRefsByCommit>;
  branches: Pick<GraphView, 'branches' | 'forkBranches'>;
};

function startSession(data: FetchedNetwork, options: TransformOptions): Session {
  const { focusUser } = resolveFocus(data.meta, options);
  const branches = viewBranches(data.meta, focusUser, 'network');
  return {
    meta: data.meta,
    owner: options.inputOwner,
    repo: options.inputRepo,
    commits: [],
    view: { commits: [], edges: [], laneCount: 0, ...branches },
    rowBySha: new Map(),
    spaceToLane: new Map(),
    edgesByRow: [],
    rowsWaitingOnParent: new Map(),
    refsByCommit: buildRefsByCommit(data.meta, focusUser, 'network'),
    branches,
  };
}

function continuesSession(
  session: Session,
  data: FetchedNetwork,
  options: TransformOptions,
): boolean {
  return (
    session.meta === data.meta &&
    session.owner === options.inputOwner &&
    session.repo === options.inputRepo &&
    session.commits.length <= data.commits.length &&
    session.commits.every((commit, row) => commit === data.commits[row])
  );
}

function loadedParents(commit: NetworkRawCommit, rowBySha: ReadonlyMap<string, number>): string[] {
  const parents: string[] = [];
  for (const { sha } of commit.parents) {
    if (sha !== commit.id && rowBySha.has(sha) && !parents.includes(sha)) parents.push(sha);
  }
  return parents;
}

function edgesOf(
  commit: ViewCommit,
  commits: readonly ViewCommit[],
  rowBySha: ReadonlyMap<string, number>,
): ViewEdge[] {
  return commit.parents.flatMap((sha, idx) => {
    const row = rowBySha.get(sha);
    const parent = row === undefined ? undefined : commits[row];
    return parent ? [toViewEdge(commit, parent, idx)] : [];
  });
}

function appendCommits(session: Session, data: FetchedNetwork): GraphView | null {
  const { rowBySha, spaceToLane, edgesByRow, rowsWaitingOnParent } = session;
  const firstNewRow = session.commits.length;
  const added = data.commits.slice(firstNewRow);

  for (const [i, commit] of added.entries()) {
    if (rowBySha.has(commit.id)) return null;
    rowBySha.set(commit.id, firstNewRow + i);
    if (!spaceToLane.has(commit.space)) spaceToLane.set(commit.space, spaceToLane.size);
  }

  const commits = [...session.view.commits];
  const reparented = new Set<number>();
  for (const { id } of added) {
    for (const row of rowsWaitingOnParent.get(id) ?? []) reparented.add(row);
    rowsWaitingOnParent.delete(id);
  }
  for (const row of reparented) {
    commits[row] = { ...commits[row], parents: loadedParents(data.commits[row], rowBySha) };
  }

  added.forEach((commit, i) => {
    const row = firstNewRow + i;
    for (const { sha } of commit.parents) {
      if (rowBySha.has(sha)) continue;
      const waiting = rowsWaitingOnParent.get(sha);
      if (waiting) waiting.push(row);
      else rowsWaitingOnParent.set(sha, [row]);
    }
    commits.push(
      toViewCommit(
        commit,
        row,
        spaceToLane.get(commit.space) ?? 0,
        loadedParents(commit, rowBySha),
        session.meta,
        session.refsByCommit,
      ),
    );
  });

  for (const row of reparented) edgesByRow[row] = edgesOf(commits[row], commits, rowBySha);
  for (let row = firstNewRow; row < commits.length; row++) {
    edgesByRow[row] = edgesOf(commits[row], commits, rowBySha);
  }

  return {
    commits,
    edges: edgesByRow.flat(),
    laneCount: spaceToLane.size,
    ...session.branches,
  };
}

// Repo-only visibility comes from reachability from the focus heads, which can pull in
// already-loaded commits once an older page arrives, so appending is not safe there.
export function createGraphTransformer(): GraphTransformer {
  let session: Session | null = null;
  return (data, options) => {
    if (options.mode !== 'network') {
      session = null;
      return transformNetwork(data, options);
    }
    if (session && !continuesSession(session, data, options)) session = null;
    if (session && session.commits.length === data.commits.length) return session.view;

    const next = session ?? startSession(data, options);
    const view = appendCommits(next, data);
    if (!view) {
      session = null;
      return transformNetwork(data, options);
    }
    next.commits = data.commits;
    next.view = view;
    session = next;
    return view;
  };
}
