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

export type GraphBranch = {
  name: string;
  sha: string;
};

export type GraphForkBranches = {
  owner: string;
  branches: GraphBranch[];
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
  branches: GraphBranch[];
  forkBranches: GraphForkBranches[];
};
