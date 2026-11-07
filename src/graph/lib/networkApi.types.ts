type NetworkHead = {
  name: string;
  id: string;
};

type NetworkUser = {
  name: string;
  repo: string;
  heads: NetworkHead[];
};

export type NetworkMeta = {
  nethash: string;
  focus: number;
  dates: string[];
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

export type FetchedInitialPage = {
  meta: NetworkMeta;
  commits: NetworkRawCommit[];
  nextEnd: number;
};

export type FetchedOlderPage = {
  commits: NetworkRawCommit[];
  nextEnd: number;
};

export type RetryKind = 'rateLimit' | 'network' | 'server';

export type RetryNotice = {
  kind: RetryKind;
  attempt: number;
  maxAttempts: number;
  resumeAt: number;
};

export type RequestOptions = {
  signal?: AbortSignal;
  onPending?: (attempt: number) => void;
  onRetry?: (notice: RetryNotice) => void;
};
