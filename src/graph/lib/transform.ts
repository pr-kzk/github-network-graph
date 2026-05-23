import type { GraphMode } from '@/shared/storage';
import type { FetchedNetwork, NetworkRawCommit } from './networkApi.types';
import type { GraphBranch, GraphView, ViewCommit, ViewEdge, ViewRef } from './transform.types';

export type TransformOptions = {
  mode: GraphMode;
  // 拡張機能 popup で指定された対象リポジトリ。`meta.users` の中から focus を特定するために使う。
  // `meta.focus` の値は users[] の index ではない (実フォーマット観察より) ため、
  // owner/repo マッチで本家を探し、見つからなければ users[0] にフォールバックする。
  inputOwner?: string;
  inputRepo?: string;
  // 直前 transform の space → lane を渡すと、既存 lane 番号を維持して新規 space のみ
  // 末尾 lane に追加する (loadMore でレーンが左右にずれてちらつくのを防ぐため)。
  previousSpaceToLane?: ReadonlyMap<number, number>;
};

const RESOLVE_DEPTH_LIMIT = 200;

function firstLine(message: string): string {
  const idx = message.indexOf('\n');
  return idx < 0 ? message : message.slice(0, idx);
}

function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

// `repo-only` モードでは、本家コミットの parent が「フォーク commit」を指している
// 場合があるため、フォーク commit を transparent に辿って、最初に出会う本家 commit を
// 親として採用する。これで「同じ lane なのに線が繋がらない」現象を解消する。
function resolveToVisibleAncestor(
  startSha: string,
  commitsBySha: Map<string, NetworkRawCommit>,
  visibleShaSet: Set<string>,
): string | null {
  if (visibleShaSet.has(startSha)) return startSha;
  const seen = new Set<string>();
  const stack: Array<{ sha: string; depth: number }> = [{ sha: startSha, depth: 0 }];
  while (stack.length > 0) {
    const { sha, depth } = stack.pop()!;
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

// focus owner の heads (ブランチ先端) から parent 方向に到達できる commit 集合を返す。
// `commits[].author` の意味/値はリポジトリにより揺れる (数値 index でない場合あり) ため、
// Git の意味的な「本家リポジトリのコミット」を到達可能性で定義する。
function computeFocusReachable(
  focusHeadShas: string[],
  commitsBySha: Map<string, NetworkRawCommit>,
): Set<string> {
  const reached = new Set<string>();
  const stack = [...focusHeadShas];
  while (stack.length > 0) {
    const sha = stack.pop()!;
    if (reached.has(sha)) continue;
    const c = commitsBySha.get(sha);
    if (!c) continue;
    reached.add(sha);
    for (const p of c.parents) stack.push(p.sha);
  }
  return reached;
}

export function transformNetwork(
  data: FetchedNetwork,
  options: TransformOptions,
): GraphView {
  const { meta, commits } = data;

  // focus user 解決の戦略 (3 段):
  //   1) owner/repo マッチで users から本家を探す (実フォーマットで最も信頼できる)
  //   2) meta.users[meta.focus] を試す (旧仮定との互換)
  //   3) users[0] にフォールバック (慣例として root リポジトリが先頭)
  const focusUser =
    (options.inputOwner && options.inputRepo
      ? meta.users.find(
          (u) => u.name === options.inputOwner && u.repo === options.inputRepo,
        )
      : undefined) ??
    meta.users[meta.focus] ??
    meta.users[0];
  const focusIndex = focusUser ? meta.users.indexOf(focusUser) : -1;

  const commitsBySha = new Map<string, NetworkRawCommit>();
  for (const c of commits) commitsBySha.set(c.id, c);

  const focusHeadShas = (focusUser?.heads ?? []).map((h) => h.id);
  const focusReachable = computeFocusReachable(focusHeadShas, commitsBySha);

  // 「本家のみ」の判定:
  //   1) focus user の heads が取れていれば、ヘッドから到達可能な commit を本家とみなす。
  //   2) heads が空 / 到達 0 (= heads SHA が今回のチャンクに含まれない) の場合は、
  //      到達ベースでは判定できないため、`author` インデックスでの判定にフォールバック。
  const useReachability = focusReachable.size > 0;
  const isVisible: (c: NetworkRawCommit) => boolean =
    options.mode === 'network'
      ? () => true
      : useReachability
        ? (c) => focusReachable.has(c.id)
        : (c) => c.author === focusIndex;

  const visibleShaSet = new Set<string>();
  for (const c of commits) if (isVisible(c)) visibleShaSet.add(c.id);

  // refs: focus と非 focus を両方とも refsByCommit に積む (isFocus フラグで区別)
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

  // 表示する commit を行順に並べる (元の順序を尊重)
  const visibleCommits: NetworkRawCommit[] = commits.filter(isVisible);

  // GitHub の space は飛び飛びの値 (大規模リポジトリだと 0,1,3,5,12,47 など) になりうる。
  // 「使われている space」だけ昇順で集約し 0..N-1 に詰め直す。
  // → 空き lane は消えて幅が現実的なサイズに収まる。
  // → 使われている space は順序が保たれるので、分岐の左右関係 (斜め線の向き) は保たれる。
  //
  // previousSpaceToLane が渡された場合は、既存割当を優先継承し、新規 space のみ
  // 末尾 lane に追加する (loadMore でレーンが左右にずれないようにするため)。
  const usedSpaces = new Set<number>();
  for (const c of visibleCommits) usedSpaces.add(c.space);
  const spaceToLane = new Map<number, number>();
  let nextLane = 0;
  if (options.previousSpaceToLane) {
    for (const [space, lane] of options.previousSpaceToLane) {
      if (!usedSpaces.has(space)) continue;
      spaceToLane.set(space, lane);
      if (lane >= nextLane) nextLane = lane + 1;
    }
  }
  const newSpaces: number[] = [];
  for (const s of usedSpaces) {
    if (!spaceToLane.has(s)) newSpaces.push(s);
  }
  newSpaces.sort((a, b) => a - b);
  for (const s of newSpaces) spaceToLane.set(s, nextLane++);
  const laneCount = nextLane;

  const viewCommits: ViewCommit[] = visibleCommits.map((c, row) => {
    const user = meta.users[c.author];
    const lane = spaceToLane.get(c.space) ?? 0;
    const authorDisplay = c.authorName || c.login || user?.name || '';

    const resolvedParents: string[] = [];
    const seenParent = new Set<string>();
    for (const p of c.parents) {
      const resolved = resolveToVisibleAncestor(p.sha, commitsBySha, visibleShaSet);
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
      isFocus: c.author === focusIndex,
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

  const focusHeads: ViewRef[] = (focusUser?.heads ?? []).map((h) => ({
    name: h.name,
    isFocus: true,
    ownerName: focusUser?.name ?? '',
  }));

  const branches: GraphBranch[] = (focusUser?.heads ?? [])
    .map((h) => ({ name: h.name, sha: h.id }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    commits: viewCommits,
    edges,
    laneCount,
    totalCommitsAvailable: commits.length,
    focusOwner: focusUser?.name ?? '',
    focusRepo: focusUser?.repo ?? '',
    focusHeads,
    branches,
    spaceToLane,
  };
}
