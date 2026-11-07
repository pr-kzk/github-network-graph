import type { GraphView } from './transform.types';

const SHORT_SHA_LENGTH = 7;

type NamedHeads = Pick<GraphView, 'branches' | 'forkBranches'>;

export function describeJumpTarget(view: NamedHeads, sha: string): string {
  const own = view.branches.find((branch) => branch.sha === sha);
  if (own) return own.name;
  for (const fork of view.forkBranches) {
    const match = fork.branches.find((branch) => branch.sha === sha);
    if (match) return `${fork.owner}:${match.name}`;
  }
  return sha.slice(0, SHORT_SHA_LENGTH);
}
