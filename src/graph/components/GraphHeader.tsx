import { t } from '@/shared/i18n';
import type { GraphMode } from '@/shared/storage';

export type GraphHeaderProps = {
  owner: string;
  repo: string;
  mode: GraphMode;
  onModeChange: (next: GraphMode) => void;
  onRefresh: () => void;
};

export function GraphHeader({ owner, repo, mode, onModeChange, onRefresh }: GraphHeaderProps) {
  return (
    <header className="flex flex-wrap items-center gap-4 border-b border-slate-800 px-5 py-3">
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold tracking-tight">{t('graph_header_brand')}</span>
        {owner && repo ? (
          <a
            href={`https://github.com/${owner}/${repo}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-200 hover:bg-slate-700"
          >
            {owner}/{repo}
          </a>
        ) : null}
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-md bg-slate-900 p-0.5 ring-1 ring-slate-800">
          <button
            type="button"
            onClick={() => onModeChange('repo-only')}
            className={[
              'rounded px-2.5 py-1 text-xs',
              mode === 'repo-only' ? 'bg-indigo-600 text-white' : 'text-slate-300',
            ].join(' ')}
          >
            {t('graph_mode_repo_only')}
          </button>
          <button
            type="button"
            onClick={() => onModeChange('network')}
            className={[
              'rounded px-2.5 py-1 text-xs',
              mode === 'network' ? 'bg-indigo-600 text-white' : 'text-slate-300',
            ].join(' ')}
          >
            {t('graph_mode_network')}
          </button>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-md bg-slate-800 px-3 py-1 text-xs hover:bg-slate-700"
        >
          {t('graph_refresh')}
        </button>
      </div>
    </header>
  );
}
