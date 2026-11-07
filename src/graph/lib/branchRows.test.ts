import { describe, expect, it } from 'vitest';
import { buildBranchRows } from './branchRows';
import type { GraphBranch, GraphForkBranches } from './transform.types';

const branch = (name: string): GraphBranch => ({ name, sha: name.padEnd(40, '0') });

const OWN = [branch('main'), branch('develop')];
const FORKS: GraphForkBranches[] = [
  { owner: 'alice', branches: [branch('experiment'), branch('main')] },
  { owner: 'bob', branches: [branch('hotfix')] },
];

const labels = (rows: ReturnType<typeof buildBranchRows>['rows']) =>
  rows.map((r) => (r.kind === 'heading' ? `# ${r.label}` : r.branch.name));

describe('buildBranchRows', () => {
  it('lists the repository branches without a heading when there are no forks', () => {
    expect(labels(buildBranchRows(OWN, [], '', 'Repository').rows)).toEqual(['main', 'develop']);
  });

  it('puts a heading before each group once forks are present', () => {
    expect(labels(buildBranchRows(OWN, FORKS, '', 'Repository').rows)).toEqual([
      '# Repository',
      'main',
      'develop',
      '# alice',
      'experiment',
      'main',
      '# bob',
      'hotfix',
    ]);
  });

  it('numbers options across groups and points each one at its row', () => {
    const { options, rowIndexOfOption, rows } = buildBranchRows(OWN, FORKS, '', 'Repository');
    expect(options.map((o) => o.optionIndex)).toEqual([0, 1, 2, 3, 4]);
    expect(rowIndexOfOption.map((i) => rows[i].kind)).toEqual(Array(5).fill('option'));
    expect(rowIndexOfOption[2]).toBe(4);
  });

  it.each([
    [
      'keeps every branch of a fork whose owner matches',
      ' ALICE ',
      ['# alice', 'experiment', 'main'],
    ],
    ['drops groups with no matching branch', 'hot', ['# bob', 'hotfix']],
  ])('%s the query', (_, query, expected) => {
    expect(labels(buildBranchRows(OWN, FORKS, query, 'Repository').rows)).toEqual(expected);
  });

  it('qualifies fork branch titles with their owner', () => {
    const { options } = buildBranchRows(OWN, FORKS, 'experiment', 'Repository');
    expect(options[0].title).toBe('alice:experiment');
  });
});
