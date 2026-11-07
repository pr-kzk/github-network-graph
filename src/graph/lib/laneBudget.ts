import type { ViewCommit } from './transform.types';

export function priorityLanes(commits: readonly ViewCommit[]): number[] {
  const seen = new Set<number>();
  const lanes: number[] = [];
  const add = (lane: number) => {
    if (seen.has(lane)) return;
    seen.add(lane);
    lanes.push(lane);
  };
  if (commits.length > 0) add(commits[0].lane);
  for (const commit of commits) {
    if (commit.refs.some((ref) => ref.isFocus)) add(commit.lane);
  }
  return lanes;
}

// Ranking the remaining lanes by activity would fill the budget with the busiest lines, but the
// counts change as older pages load, so lanes would hop between a slot and the gutter and rows
// would shift sideways. Ascending lane order only ever appends.
export function chooseVisibleLanes(
  laneCount: number,
  budget: number,
  priority: readonly number[],
): number[] {
  if (laneCount <= budget) return Array.from({ length: laneCount }, (_, lane) => lane);
  const chosen = new Set<number>();
  for (const lane of priority) {
    if (chosen.size >= budget) break;
    if (lane >= 0 && lane < laneCount) chosen.add(lane);
  }
  for (let lane = 0; lane < laneCount && chosen.size < budget; lane++) chosen.add(lane);
  return [...chosen].sort((a, b) => a - b);
}

type EdgeEmphasis = { opacity: number; width: number };

type EmphasisInput = {
  crowded: boolean;
  hasSelection: boolean;
  onPath: boolean;
  priority: boolean;
};

// Hiding every line outside the selected path would make the layout look different for each
// selection; faint lines keep the shape of the history and only the emphasis moves.
export function edgeEmphasis({
  crowded,
  hasSelection,
  onPath,
  priority,
}: EmphasisInput): EdgeEmphasis {
  if (!crowded) return { opacity: 1, width: 2 };
  if (onPath) return { opacity: 1, width: 2.5 };
  if (hasSelection) return { opacity: 0.22, width: 1 };
  if (priority) return { opacity: 1, width: 2 };
  return { opacity: 0.45, width: 1.25 };
}

export function collectPath(
  startSha: string,
  commitBySha: ReadonlyMap<string, ViewCommit>,
  childrenBySha: ReadonlyMap<string, readonly string[]>,
): Set<string> {
  const path = new Set<string>([startSha]);
  const walk = (next: (sha: string) => readonly string[]) => {
    const stack = [startSha];
    for (let current = stack.pop(); current !== undefined; current = stack.pop()) {
      for (const sha of next(current)) {
        if (path.has(sha)) continue;
        path.add(sha);
        stack.push(sha);
      }
    }
  };
  walk((sha) => commitBySha.get(sha)?.parents ?? []);
  walk((sha) => childrenBySha.get(sha) ?? []);
  return path;
}
