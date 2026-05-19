import { useMemo } from 'react';
import type { ViewCommit } from '../lib/transform.types';

// 各コミットを「親」として参照している子コミット SHA の一覧。
// CommitDetail で parents の隣に表示し、グラフ閲覧の往復導線にする。
export function useChildrenIndex(commits: readonly ViewCommit[]): Map<string, string[]> {
  return useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of commits) {
      for (const parentSha of c.parents) {
        const list = map.get(parentSha);
        if (list) list.push(c.sha);
        else map.set(parentSha, [c.sha]);
      }
    }
    return map;
  }, [commits]);
}
