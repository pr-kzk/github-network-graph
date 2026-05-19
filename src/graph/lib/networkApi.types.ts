// GitHub Network ページが内部利用しているエンドポイントのレスポンス型。
// 公式仕様ではないため、実機 (DevTools の Network タブ) で観察した実物と
// 差異があれば実物に合わせて更新すること。
// 観察対象:
//   GET https://github.com/{owner}/{repo}/network/meta
//   GET https://github.com/{owner}/{repo}/network/chunk?nethash=...&start=N&end=M

export type NetworkHead = {
  name: string;
  id: string;
};

export type NetworkUser = {
  name: string;
  repo: string;
  heads: NetworkHead[];
};

export type NetworkMeta = {
  nethash: string;
  focus: number;
  dates: string[];
  name: string;
  users: NetworkUser[];
};

export type NetworkParent = {
  sha: string;
  space: number;
};

export type NetworkRawCommit = {
  id: string;
  author: number;
  time: number;
  space: number;
  parents: NetworkParent[];
  message: string;
  date?: string;
  authorName?: string;
  login?: string;
};

export type NetworkChunk = {
  commits: NetworkRawCommit[];
};

export type FetchedNetwork = {
  meta: NetworkMeta;
  commits: NetworkRawCommit[];
};

// 初回ページ取得結果。commits は新→古の順。nextEnd は次回 fetchOlderPage に渡す end。
// nextEnd === 0 でリポジトリの最古に到達。
export type FetchedInitialPage = {
  meta: NetworkMeta;
  commits: NetworkRawCommit[];
  nextEnd: number;
  totalCount: number;
};

// 古い側のページ取得結果。commits は新→古の順。exhausted=true で最古到達。
export type FetchedOlderPage = {
  commits: NetworkRawCommit[];
  nextEnd: number;
  exhausted: boolean;
};
