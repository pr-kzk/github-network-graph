import { t } from '@/shared/i18n';
import type { GraphMode } from '@/shared/storage';
import type { GraphBranch } from '../lib/transform.types';
import { BranchMenu } from './BranchMenu';

export type GraphHeaderProps = {
  owner: string;
  repo: string;
  mode: GraphMode;
  branches: GraphBranch[];
  onModeChange: (next: GraphMode) => void;
  onRefresh: () => void;
  onSelectBranch: (sha: string) => void;
};

export function GraphHeader({
  owner,
  repo,
  mode,
  branches,
  onModeChange,
  onRefresh,
  onSelectBranch,
}: GraphHeaderProps) {
  return (
    <header className="flex flex-wrap items-center gap-4 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold tracking-tight">{t('graph_header_brand')}</span>
        {owner && repo ? (
          <a
            href={`https://github.com/${owner}/${repo}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-slate-200 px-2 py-0.5 font-mono text-xs text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {owner}/{repo}
          </a>
        ) : null}
      </div>
      <div className="ml-auto flex items-center gap-3">
        {branches.length > 0 ? (
          <BranchMenu branches={branches} onSelect={onSelectBranch} />
        ) : null}
        <div className="flex items-center gap-1 rounded-md bg-slate-100 p-0.5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <button
            type="button"
            onClick={() => onModeChange('repo-only')}
            className={[
              'rounded px-2.5 py-1 text-xs',
              mode === 'repo-only'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-700 dark:text-slate-300',
            ].join(' ')}
          >
            {t('graph_mode_repo_only')}
          </button>
          <button
            type="button"
            onClick={() => onModeChange('network')}
            className={[
              'rounded px-2.5 py-1 text-xs',
              mode === 'network'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-700 dark:text-slate-300',
            ].join(' ')}
          >
            {t('graph_mode_network')}
          </button>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-md bg-slate-200 px-3 py-1 text-xs text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          {t('graph_refresh')}
        </button>
      </div>
    </header>
  );
}
