import { t } from '@/shared/i18n';
import type { GraphMode } from '@/shared/storage';
import type { RepoRef } from '../lib/parseUrl';
import type { GraphBranch, GraphForkBranches } from '../lib/transform.types';
import { BranchMenu } from './BranchMenu';
import { ModeToggle } from './ModeToggle';
import { RepoSwitcher } from './RepoSwitcher';
import { SearchBox, type SearchBoxProps } from './SearchBox';
import { Spinner } from './Spinner';
import { BUTTON_SECONDARY, FOCUS_RING } from '@/shared/ui';

type GraphHeaderProps = {
  owner: string;
  repo: string;
  mode: GraphMode;
  branches: GraphBranch[];
  forkBranches: GraphForkBranches[];
  selectedSha: string | null;
  refreshing: boolean;
  seeking: boolean;
  onModeChange: (next: GraphMode) => void;
  onRefresh: () => void;
  onSelectBranch: (sha: string) => void;
  onSwitchRepo: (target: RepoRef) => void;
  onShowShortcuts: () => void;
  search: SearchBoxProps | null;
};

export function GraphHeader({
  owner,
  repo,
  mode,
  branches,
  forkBranches,
  selectedSha,
  refreshing,
  seeking,
  onModeChange,
  onRefresh,
  onSelectBranch,
  onSwitchRepo,
  onShowShortcuts,
  search,
}: GraphHeaderProps) {
  return (
    <header className="flex flex-wrap items-center gap-4 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold tracking-tight">{t('graph_header_brand')}</span>
        {owner && repo ? <RepoSwitcher owner={owner} repo={repo} onSwitch={onSwitchRepo} /> : null}
      </div>
      {search ? <SearchBox {...search} /> : null}
      <div className="ml-auto flex items-center gap-3">
        {branches.length + forkBranches.length > 0 ? (
          <BranchMenu
            branches={branches}
            forkBranches={forkBranches}
            selectedSha={selectedSha}
            busy={seeking}
            onSelect={onSelectBranch}
          />
        ) : null}
        <ModeToggle mode={mode} onChange={onModeChange} />
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-busy={refreshing}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs disabled:cursor-wait disabled:opacity-80 ${BUTTON_SECONDARY}`}
        >
          {refreshing ? <Spinner /> : null}
          {refreshing ? t('graph_status_refreshing') : t('graph_refresh')}
        </button>
        <button
          type="button"
          onClick={onShowShortcuts}
          className={`px-3 py-1 text-xs ${BUTTON_SECONDARY} ${FOCUS_RING}`}
        >
          {t('graph_shortcuts_button')}
        </button>
      </div>
    </header>
  );
}
