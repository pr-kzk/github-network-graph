import { useEffect, useState } from 'react';
import { errorMessage, isObject } from '@/shared/errors';
import { trackEvent } from '@/shared/telemetry';
import {
  type CommitDetailError,
  type CommitDetailExtra,
  fetchCommitDetail,
  getCachedCommitDetail,
} from '../lib/commitDetailApi';

export type CommitDetailExtraState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: CommitDetailExtra }
  | { status: 'error'; error: CommitDetailError };

export type UseCommitDetailExtraArgs = {
  owner: string;
  repo: string;
  authorOwner?: string;
  authorRepo?: string;
  sha: string | null;
};

// 選択コミットが変わるたびに stats / files を遅延 fetch する。
// SHA でキャッシュ済みなら同期的に ready を返し、再 fetch しない。
//
// 設計メモ:
// - sha 変更時のリセットは「render 中の派生 state 更新」(React 公式の
//   Adjusting-state-when-props-change パターン) で行う。useEffect 内で
//   setState({status:'idle'/'loading'}) すると cascading render 警告になるため。
// - fetch 自体は副作用なので useEffect 内で起動し、Promise の then 内で
//   setState する (非同期パスは set-state-in-effect の対象外)。
export function useCommitDetailExtra(args: UseCommitDetailExtraArgs): CommitDetailExtraState {
  const { owner, repo, authorOwner, authorRepo, sha } = args;

  // 初期 state / key 計算は useState の lazy initial で 1 度きりに抑える。
  const [state, setState] = useState<CommitDetailExtraState>(() =>
    computeInitial({ owner, repo, authorOwner, authorRepo, sha }),
  );
  // 「最後に処理した引数の組」を覚えておき、props 変化を検出して同期リセット。
  const [trackedKey, setTrackedKey] = useState(() => makeKey(args));
  const currentKey = makeKey(args);
  if (trackedKey !== currentKey) {
    setTrackedKey(currentKey);
    setState(computeInitial({ owner, repo, authorOwner, authorRepo, sha }));
  }

  useEffect(() => {
    if (!sha) return;
    // 既にキャッシュ済み (= 上で ready がセットされる) なら fetch 不要。
    const cached =
      getCachedCommitDetail({
        owner: authorOwner || owner,
        repo: authorRepo || repo,
        sha,
      }) ?? getCachedCommitDetail({ owner, repo, sha });
    if (cached) return;

    const controller = new AbortController();
    fetchCommitDetail({
      owner,
      repo,
      authorOwner,
      authorRepo,
      sha,
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return;
        setState({ status: 'ready', data });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const error = toError(err);
        trackEvent('commit_detail_error', { kind: error.kind });
        setState({ status: 'error', error });
      });

    return () => controller.abort();
  }, [owner, repo, authorOwner, authorRepo, sha]);

  return state;
}

function makeKey(args: UseCommitDetailExtraArgs): string {
  return `${args.owner} ${args.repo} ${args.authorOwner ?? ''} ${args.authorRepo ?? ''} ${args.sha ?? ''}`;
}

function computeInitial(args: UseCommitDetailExtraArgs): CommitDetailExtraState {
  const { owner, repo, authorOwner, authorRepo, sha } = args;
  if (!sha) return { status: 'idle' };
  const cached =
    getCachedCommitDetail({
      owner: authorOwner || owner,
      repo: authorRepo || repo,
      sha,
    }) ?? getCachedCommitDetail({ owner, repo, sha });
  return cached ? { status: 'ready', data: cached } : { status: 'loading' };
}

function toError(err: unknown): CommitDetailError {
  if (isObject(err) && typeof err.kind === 'string' && typeof err.message === 'string') {
    // commitDetailApi の makeError 経由なので既に CommitDetailError 形。
    return err as CommitDetailError;
  }
  return { kind: 'network', message: errorMessage(err, 'unknown') };
}
