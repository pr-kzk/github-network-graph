import { useCallback, useEffect, useState } from 'react';
import { trackEvent } from '@/shared/telemetry';
import { fetchCommitDetail } from '../lib/commitDetailApi';
import { getCachedCommitDetail } from '../lib/commitDetailCache';
import {
  isCommitDetailError,
  makeError,
  type CommitDetailError,
  type CommitDetailExtra,
} from '../lib/commitDetailTypes';

export type CommitDetailExtraState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: CommitDetailExtra }
  | { status: 'error'; error: CommitDetailError };

type UseCommitDetailExtraArgs = {
  owner: string;
  repo: string;
  authorOwner?: string;
  authorRepo?: string;
  sha: string | null;
};

type UseCommitDetailExtraResult = {
  state: CommitDetailExtraState;
  retry: () => void;
};

// props 変化時のリセットは render 中の派生 state 更新で行う。effect 内で
// setState({status:'loading'}) する案は cascading render になるため採らない。
export function useCommitDetailExtra(args: UseCommitDetailExtraArgs): UseCommitDetailExtraResult {
  const { owner, repo, authorOwner, authorRepo, sha } = args;

  const [state, setState] = useState<CommitDetailExtraState>(() => computeInitial(args));
  const [attempt, setAttempt] = useState(0);
  const [trackedKey, setTrackedKey] = useState(() => makeKey(args));
  const currentKey = makeKey(args);
  if (trackedKey !== currentKey) {
    setTrackedKey(currentKey);
    setAttempt(0);
    setState(computeInitial(args));
  }

  useEffect(() => {
    if (!sha) return undefined;
    if (getCachedCommitDetail({ owner, repo, sha })) return undefined;

    const controller = new AbortController();
    fetchCommitDetail({
      owner,
      repo,
      authorOwner,
      authorRepo,
      sha,
      signal: controller.signal,
      skipMissingCache: attempt > 0,
    })
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: 'ready', data });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const error = isCommitDetailError(err) ? err : makeError('network');
        trackEvent('commit_detail_error', { kind: error.kind });
        setState({ status: 'error', error });
      });

    return () => controller.abort();
  }, [owner, repo, authorOwner, authorRepo, sha, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry };
}

function makeKey(args: UseCommitDetailExtraArgs): string {
  return `${args.owner} ${args.repo} ${args.authorOwner ?? ''} ${args.authorRepo ?? ''} ${args.sha ?? ''}`;
}

function computeInitial({ owner, repo, sha }: UseCommitDetailExtraArgs): CommitDetailExtraState {
  if (!sha) return { status: 'idle' };
  const cached = getCachedCommitDetail({ owner, repo, sha });
  return cached ? { status: 'ready', data: cached } : { status: 'loading' };
}
