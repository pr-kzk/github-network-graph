import { useCallback, useEffect, useMemo, useState } from 'react';
import { t } from '@/shared/i18n';
import { type GraphMode, localStore, recordRecentRepo } from '@/shared/storage';
import { useLocalValue } from '@/shared/useLocalValue';
import { useTheme } from '@/shared/useTheme';
import { CommitContextMenu } from './components/CommitContextMenu';
import { CommitDetail } from './components/CommitDetail';
import { CommitTooltip } from './components/CommitTooltip';
import { ErrorState } from './components/ErrorState';
import { GraphHeader } from './components/GraphHeader';
import { GraphList } from './components/GraphList';
import { RepoForm } from './components/RepoForm';
import { useChildrenIndex } from './hooks/useChildrenIndex';
import { useCommitContextMenu } from './hooks/useCommitContextMenu';
import { useGraphData } from './hooks/useGraphData';
import type { GraphBranch, ViewCommit } from './lib/transform.types';

// 派生 Map の deps として「コミットなし」状態の安定参照を提供する。
const EMPTY_COMMITS: ViewCommit[] = [];
// ready でない間に GraphHeader へ渡す安定参照。
const EMPTY_BRANCHES: GraphBranch[] = [];

export type GraphPageProps = {
  initialOwner: string;
  initialRepo: string;
};

export function GraphPage({ initialOwner, initialRepo }: GraphPageProps) {
  useTheme();
  const [owner, setOwner] = useState(initialOwner);
  const [repo, setRepo] = useState(initialRepo);
  const prefs = useLocalValue('graphPrefs');
  const mode = prefs.mode;
  const [selectedSha, setSelectedSha] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    void recordRecentRepo(owner, repo);
  }, [owner, repo]);

  const { state, loadMore } = useGraphData({ owner, repo, mode, refreshKey });

  // 派生 Map は commits 配列の参照だけに依存。loadingMore トグル等で再生成しない。
  const viewCommits = state.status === 'ready' ? state.view.commits : EMPTY_COMMITS;

  const commitBySha = useMemo(() => {
    const map = new Map<string, ViewCommit>();
    for (const c of viewCommits) map.set(c.sha, c);
    return map;
  }, [viewCommits]);

  const childrenBySha = useChildrenIndex(viewCommits);

  const selectedCommit = useMemo(() => {
    if (!selectedSha) return null;
    return commitBySha.get(selectedSha) ?? null;
  }, [commitBySha, selectedSha]);

  const handleModeChange = useCallback(async (next: GraphMode) => {
    // useLocalValue が同期的に新値を返すので setMode は不要 (cache が optimistic 更新する)。
    await localStore.set('graphPrefs', { ...prefs, mode: next });
  }, [prefs]);

  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleSubmitRepo = useCallback((o: string, r: string) => {
    setOwner(o);
    setRepo(r);
    setSelectedSha(null);
    const url = new URL(window.location.href);
    url.searchParams.set('owner', o);
    url.searchParams.set('repo', r);
    window.history.replaceState(null, '', url.toString());
  }, []);

  const ctx = useCommitContextMenu({ commitBySha, owner, repo, onSelectSha: setSelectedSha });

  return (
    <div className="flex h-screen flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <GraphHeader
        owner={owner}
        repo={repo}
        mode={mode}
        branches={state.status === 'ready' ? state.view.branches : EMPTY_BRANCHES}
        onModeChange={handleModeChange}
        onRefresh={handleRefresh}
        onSelectBranch={setSelectedSha}
      />

      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {!owner || !repo ? (
            <div className="m-6 max-w-xl rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/60">
              <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
                {t('graph_repo_prompt_prefix')}{' '}
                <span className="font-mono text-slate-800 dark:text-slate-200">owner/repo</span>{' '}
                {t('graph_repo_prompt_suffix')}
              </p>
              <RepoForm onSubmit={handleSubmitRepo} />
            </div>
          ) : state.status === 'loading' || state.status === 'idle' ? (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-600 dark:text-slate-400">
              {t('graph_loading')}
            </div>
          ) : state.status === 'error' ? (
            <ErrorState
              kind={state.kind}
              message={state.message}
              owner={owner}
              repo={repo}
              onRetry={handleRefresh}
            />
          ) : (
            <GraphList
              view={state.view}
              selectedSha={selectedSha}
              onSelect={setSelectedSha}
              onHoverCommit={ctx.handlers.onHoverCommit}
              onLeaveCommit={ctx.handlers.onLeaveCommit}
              onContextCommit={ctx.handlers.onContextCommit}
              hasMore={state.hasMore}
              loadingMore={state.loadingMore}
              olderError={state.olderError}
              onLoadMore={loadMore}
            />
          )}
        </div>
        <aside className="w-[420px] shrink-0 border-l border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50">
          <CommitDetail
            commit={selectedCommit}
            owner={owner}
            repo={repo}
            childrenShas={
              selectedCommit ? childrenBySha.get(selectedCommit.sha) ?? [] : []
            }
            onParentClick={(sha) => setSelectedSha(sha)}
            onChildClick={(sha) => setSelectedSha(sha)}
          />
        </aside>
      </div>

      {ctx.showTooltip && ctx.hoveredCommit ? (
        <CommitTooltip commit={ctx.hoveredCommit} x={ctx.hover!.x} y={ctx.hover!.y} />
      ) : null}
      {ctx.menu && ctx.menuItems.length > 0 ? (
        <CommitContextMenu
          x={ctx.menu.x}
          y={ctx.menu.y}
          items={ctx.menuItems}
          onClose={ctx.handlers.closeMenu}
        />
      ) : null}
    </div>
  );
}
