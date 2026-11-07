import type { GraphBranch, GraphForkBranches } from './transform.types';

export type BranchHeadingRow = { kind: 'heading'; key: string; label: string };

export type BranchOptionRow = {
  kind: 'option';
  key: string;
  branch: GraphBranch;
  title: string;
  optionIndex: number;
};

export type BranchRow = BranchHeadingRow | BranchOptionRow;

export type BranchRows = {
  rows: BranchRow[];
  options: BranchOptionRow[];
  rowIndexOfOption: number[];
};

type BranchGroup = { owner: string | null; branches: GraphBranch[] };

function filterGroups(
  branches: GraphBranch[],
  forkBranches: GraphForkBranches[],
  query: string,
): BranchGroup[] {
  if (query === '') {
    return [{ owner: null, branches }, ...forkBranches];
  }
  const matches = (name: string) => name.toLowerCase().includes(query);
  return [
    { owner: null, branches: branches.filter((b) => matches(b.name)) },
    ...forkBranches.map((fork) => ({
      owner: fork.owner,
      branches: matches(fork.owner) ? fork.branches : fork.branches.filter((b) => matches(b.name)),
    })),
  ];
}

export function buildBranchRows(
  branches: GraphBranch[],
  forkBranches: GraphForkBranches[],
  query: string,
  repoHeading: string,
): BranchRows {
  const rows: BranchRow[] = [];
  const options: BranchOptionRow[] = [];
  const rowIndexOfOption: number[] = [];
  const grouped = forkBranches.length > 0;

  for (const group of filterGroups(branches, forkBranches, query.trim().toLowerCase())) {
    if (group.branches.length === 0) continue;
    const label = group.owner ?? (grouped ? repoHeading : null);
    if (label !== null) {
      rows.push({ kind: 'heading', key: `heading:${group.owner ?? ''}`, label });
    }
    for (const branch of group.branches) {
      const option: BranchOptionRow = {
        kind: 'option',
        key: `${group.owner ?? ''}/${branch.name}:${branch.sha}`,
        branch,
        title: group.owner ? `${group.owner}:${branch.name}` : branch.name,
        optionIndex: options.length,
      };
      rowIndexOfOption.push(rows.length);
      rows.push(option);
      options.push(option);
    }
  }
  return { rows, options, rowIndexOfOption };
}
