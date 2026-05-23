export type ViewCommit = {
  sha: string;
  shortSha: string;
  row: number;
  lane: number;
  time: number;
  dateLabel: string;
  authorName: string;
  authorLogin: string;
  authorRepo: string;
  isFocus: boolean;
  message: string;
  subject: string;
  parents: string[];
  refs: ViewRef[];
};

export type ViewRef = {
  name: string;
  isFocus: boolean;
  ownerName: string;
};

// 本家リポジトリのブランチ先端。ヘッダーのジャンプ用セレクタが name で表示し、
// sha でその先端コミット行へスクロールする。
export type GraphBranch = {
  name: string;
  sha: string;
};

export type ViewEdge = {
  fromSha: string;
  toSha: string;
  fromRow: number;
  toRow: number;
  fromLane: number;
  toLane: number;
  isMerge: boolean;
};

export type GraphView = {
  commits: ViewCommit[];
  edges: ViewEdge[];
  laneCount: number;
  totalCommitsAvailable: number;
  focusOwner: string;
  focusRepo: string;
  focusHeads: ViewRef[];
  // 本家ブランチ一覧 (name 昇順)。ヘッダーのブランチジャンプに使う。
  branches: GraphBranch[];
  // 採番済みの space → lane のスナップショット。次回 transform に渡すと
  // 既存 lane 番号が維持され、追加コミットによるレーン左右シフトを防げる。
  spaceToLane: ReadonlyMap<number, number>;
};
