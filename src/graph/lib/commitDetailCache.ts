import { isObject } from '@/shared/errors';
import type { CommitDetailExtra } from './commitDetailTypes';

const STORAGE_PREFIX = 'commitDetail:';

const memory = new Map<string, CommitDetailExtra>();

type CommitDetailCacheKey = { owner: string; repo: string; sha: string };

function toKey({ owner, repo, sha }: CommitDetailCacheKey): string {
  return `${STORAGE_PREFIX}${owner}/${repo}@${sha}`;
}

function isCommitDetailExtra(value: unknown): value is CommitDetailExtra {
  return (
    isObject(value) &&
    typeof value.additions === 'number' &&
    typeof value.deletions === 'number' &&
    typeof value.total === 'number' &&
    typeof value.truncated === 'boolean' &&
    Array.isArray(value.files)
  );
}

export function getCachedCommitDetail(key: CommitDetailCacheKey): CommitDetailExtra | null {
  return memory.get(toKey(key)) ?? null;
}

// sessionStorage ではなく chrome.storage.session を使うのは、グラフページが開き直されても
// 引き継げ、かつ既存の "storage" 権限だけで足りるため。
export async function loadCachedCommitDetail(
  key: CommitDetailCacheKey,
): Promise<CommitDetailExtra | null> {
  const storageKey = toKey(key);
  const hit = memory.get(storageKey);
  if (hit) return hit;
  try {
    const stored = (await chrome.storage.session.get(storageKey))[storageKey];
    if (!isCommitDetailExtra(stored)) return null;
    memory.set(storageKey, stored);
    return stored;
  } catch {
    return null;
  }
}

// 容量超過などの保存失敗を投げ直さないのは、取得自体は成功しており
// キャッシュ都合でユーザーの表示を失敗扱いにしたくないため。
export async function storeCommitDetail(
  key: CommitDetailCacheKey,
  value: CommitDetailExtra,
): Promise<void> {
  const storageKey = toKey(key);
  memory.set(storageKey, value);
  try {
    await chrome.storage.session.set({ [storageKey]: value });
  } catch {
    return;
  }
}

const NOT_FOUND_TTL_MS = 5 * 60_000;

const notFoundUntil = new Map<string, number>();

export function isKnownMissing(key: CommitDetailCacheKey): boolean {
  const storageKey = toKey(key);
  const until = notFoundUntil.get(storageKey);
  if (until === undefined) return false;
  if (until > Date.now()) return true;
  notFoundUntil.delete(storageKey);
  return false;
}

export function rememberMissing(key: CommitDetailCacheKey): void {
  notFoundUntil.set(toKey(key), Date.now() + NOT_FOUND_TTL_MS);
}

export function forgetMissing(key: CommitDetailCacheKey): void {
  notFoundUntil.delete(toKey(key));
}

export function resetCommitDetailMemoryCacheForTest(): void {
  memory.clear();
  notFoundUntil.clear();
}
