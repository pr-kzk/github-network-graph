import { useCallback, useRef, type Dispatch, type MutableRefObject } from 'react';
import { CHUNK_PAGE_SIZE, type createGithubNetworkClient } from '../lib/networkApi';
import type { GraphDataAction, RawState } from './graphDataReducer';
import { pageOptions, reportGraphError } from './graphDataRequests';
import type { PageSession } from './usePageSession';

export const SEEK_CONCURRENCY = 2;

type UseSeekArgs = {
  client: ReturnType<typeof createGithubNetworkClient>;
  owner: string;
  repo: string;
  rawRef: MutableRefObject<RawState>;
  session: PageSession;
  dispatch: Dispatch<GraphDataAction>;
};

export function useSeek({ client, owner, repo, rawRef, session, dispatch }: UseSeekArgs) {
  const seekRun = useRef(0);

  const seekTo = useCallback(
    (sha: string) => {
      const r = rawRef.current;
      if (r.status !== 'ready' || !r.hasMore || r.loadingMore || r.refreshing) return;
      const startedIn = session.generation();
      const run = ++seekRun.current;
      const signal = session.signal();
      const superseded = () => session.generation() !== startedIn || seekRun.current !== run;
      dispatch({ type: 'seek/start' });

      void (async () => {
        let nextEnd = r.nextEnd;
        try {
          while (nextEnd > 0) {
            const ends: number[] = [];
            for (
              let end = nextEnd;
              end > 0 && ends.length < SEEK_CONCURRENCY;
              end -= CHUNK_PAGE_SIZE
            ) {
              ends.push(end);
            }
            const pages = await Promise.all(
              ends.map((end) =>
                client.fetchOlderPage(owner, repo, r.meta, end, pageOptions(signal, dispatch)),
              ),
            );
            if (superseded()) return;
            const commits = pages.flatMap((p) => p.commits);
            nextEnd = Math.min(...pages.map((p) => p.nextEnd));
            dispatch({ type: 'seek/progress', commits, nextEnd });
            if (commits.some((c) => c.id === sha)) break;
          }
          dispatch({ type: 'seek/end' });
        } catch (err: unknown) {
          if (superseded()) return;
          dispatch({ type: 'seek/end', error: reportGraphError(err, 'older') });
        }
      })();
    },
    [client, owner, repo, rawRef, session, dispatch],
  );

  const cancelSeek = useCallback(() => {
    if (rawRef.current.status !== 'ready' || !rawRef.current.seek) return;
    seekRun.current += 1;
    session.renewAbort();
    dispatch({ type: 'seek/end' });
  }, [rawRef, session, dispatch]);

  return { seekTo, cancelSeek };
}
