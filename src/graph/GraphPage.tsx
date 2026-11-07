import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { t, tWith } from '@/shared/i18n';
import { recordRecentRepo } from '@/shared/storage';
import { trackEvent } from '@/shared/telemetry';
import { useTheme } from '@/shared/useTheme';
import type { BranchMenuProps } from './components/BranchMenu';
import { CommitDetail } from './components/CommitDetail';
import { DetailPanel } from './components/DetailPanel';
import { ErrorState } from './components/ErrorState';
import { GraphHeader } from './components/GraphHeader';
import { GraphList, type GraphPaging } from './components/GraphList';
import { GraphPopups } from './components/GraphPopups';
import { GraphSkeleton } from './components/GraphSkeleton';
import { GraphStatusBar } from './components/GraphStatusBar';
import { RepoPrompt } from './components/RepoPrompt';
import { SeekBanner } from './components/SeekBanner';
import { Toast } from './components/Toast';
import { useCommitSearch } from './hooks/useCommitSearch';
import { useCopyToClipboard } from './hooks/useCopyToClipboard';
import { useDetailLayout } from './hooks/useDetailLayout';
import { useRepoDocumentTitle } from './hooks/useDocumentTitle';
import { useFocusRequests } from './hooks/useFocusRequests';
import { useGraphData } from './hooks/useGraphData';
import { useGraphKeyboard } from './hooks/useGraphKeyboard';
import { useGraphPopups } from './hooks/useGraphPopups';
import { useGraphSelection } from './hooks/useGraphSelection';
import { useGraphUrlState } from './hooks/useGraphUrlState';
import { useJumpFeedback } from './hooks/useJumpFeedback';
import { useToast } from './hooks/useToast';
import { selectGraphScreen } from './lib/graphScreen';
import type { GraphUrlState } from './lib/graphUrlState';
import { describeJumpTarget } from './lib/jumpTarget';
import type { RepoRef } from './lib/parseUrl';
import type { ViewCommit } from './lib/transform.types';

const EMPTY_COMMITS: ViewCommit[] = [];
const NO_URL_STATE: GraphUrlState = { sha: null, mode: null };

type GraphPageProps = {
  initialOwner: string;
  initialRepo: string;
  initialUrlState?: GraphUrlState;
};

export function GraphPage({
  initialOwner,
  initialRepo,
  initialUrlState = NO_URL_STATE,
}: GraphPageProps) {
  useTheme();
  const [owner, setOwner] = useState(initialOwner);
  const [repo, setRepo] = useState(initialRepo);
  useRepoDocumentTitle(owner, repo);
  useFocusRequests(owner, repo);
  const detailLayout = useDetailLayout();
  const { toast, showToast } = useToast();
  const { selectedSha, setSelectedSha, mode, changeMode, linkTo } = useGraphUrlState({
    owner,
    repo,
    initial: initialUrlState,
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const detailRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    void recordRecentRepo(owner, repo);
  }, [owner, repo]);

  const handleRefreshFailed = useCallback(
    () => showToast('error', t('toast_refresh_failed')),
    [showToast],
  );
  const { state, loadMore, seekTo, cancelSeek } = useGraphData({
    owner,
    repo,
    mode,
    refreshKey,
    onRefreshFailed: handleRefreshFailed,
  });

  const viewCommits = state.status === 'ready' ? state.view.commits : EMPTY_COMMITS;
  const { commitBySha, childrenBySha, selectedCommit, selectedChildren, containingRefs } =
    useGraphSelection({
      state,
      viewCommits,
      selectedSha,
      setSelectedSha,
      seekTo,
      cancelSeek,
      showToast,
    });

  const handleRefresh = useCallback(() => {
    trackEvent('graph_refresh');
    setRefreshKey((k) => k + 1);
  }, []);

  const handleSelectCommit = useCallback(
    (sha: string) => {
      setSelectedSha(sha);
      trackEvent('commit_select');
    },
    [setSelectedSha],
  );

  const switchRepo = useCallback(
    (o: string, r: string) => {
      setOwner(o);
      setRepo(r);
      setSelectedSha(null);
    },
    [setSelectedSha],
  );

  const handleSwitchRepo = useCallback(
    (target: RepoRef) => {
      trackEvent('repo_switch');
      switchRepo(target.owner, target.repo);
    },
    [switchRepo],
  );

  const handleCancelSeek = useCallback(() => {
    cancelSeek();
    setSelectedSha(null);
  }, [cancelSeek, setSelectedSha]);

  const seek = state.status === 'ready' ? state.seek : null;
  const view = state.status === 'ready' ? state.view : null;
  const handleJumped = useCallback(
    (sha: string) => {
      if (view)
        showToast('success', tWith('toast_jumped', { target: describeJumpTarget(view, sha) }));
    },
    [view, showToast],
  );
  const flashSha = useJumpFeedback({
    seeking: seek !== null,
    selectedSha,
    isLoaded: selectedCommit !== null,
    onJumped: handleJumped,
  });

  const copy = useCopyToClipboard(showToast);
  const copyLink = useCallback(
    (sha: string) => {
      trackEvent('link_copy');
      void copy(linkTo(sha));
    },
    [copy, linkTo],
  );

  const popups = useGraphPopups({
    commitBySha,
    owner,
    repo,
    onSelectSha: setSelectedSha,
    onCopy: copy,
    onCopyLink: copyLink,
    onSelectRow: handleSelectCommit,
  });
  const { showShortcuts } = popups;

  const search = useCommitSearch({
    scope: `${owner}/${repo}`,
    commits: viewCommits,
    commitBySha,
    selectedSha,
    onSelect: setSelectedSha,
  });

  useGraphKeyboard({
    commits: viewCommits,
    commitBySha,
    childrenBySha,
    selectedSha,
    onSelect: setSelectedSha,
    onFocusDetail: () => {
      detailLayout.reveal();
      detailRef.current?.focus();
    },
    onFocusSearch: () => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    },
    onShowShortcuts: showShortcuts,
  });

  const { ready, loading, retry, pendingNotice } = selectGraphScreen(state);
  const hasMore = ready?.hasMore ?? false;
  const loadingMore = ready?.loadingMore ?? false;
  const olderError = ready?.olderError ?? null;
  const paging = useMemo<GraphPaging>(
    () => ({ hasMore, loadingMore, olderError, onLoadMore: loadMore }),
    [hasMore, loadingMore, olderError, loadMore],
  );
  const branchMenu = useMemo<BranchMenuProps | null>(
    () =>
      ready && ready.view.branches.length + ready.view.forkBranches.length > 0
        ? {
            branches: ready.view.branches,
            forkBranches: ready.view.forkBranches,
            selectedSha,
            busy: seek !== null,
            onSelect: setSelectedSha,
          }
        : null,
    [ready, selectedSha, seek, setSelectedSha],
  );

  return (
    <div className="flex h-screen flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <GraphHeader
        owner={owner}
        repo={repo}
        mode={mode}
        refreshing={loading || (ready?.refreshing ?? false)}
        onSwitchRepo={handleSwitchRepo}
        onModeChange={changeMode}
        onRefresh={handleRefresh}
        onShowShortcuts={showShortcuts}
        branchMenu={branchMenu}
        search={
          ready
            ? {
                query: search.query,
                matchCount: search.result.rows.length,
                loadedCount: viewCommits.length,
                hasMore: ready.hasMore,
                loadingMore: ready.loadingMore,
                inputRef: searchInputRef,
                onQueryChange: search.setQuery,
                onStep: search.step,
                onLoadOlder: loadMore,
              }
            : null
        }
      />

      <div className="flex min-h-0 flex-1">
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          {!owner || !repo ? (
            <RepoPrompt onSubmit={switchRepo} />
          ) : loading ? (
            <GraphSkeleton pendingNotice={pendingNotice} retry={retry} />
          ) : ready ? (
            <>
              <GraphList
                view={ready.view}
                selectedSha={selectedSha}
                flashSha={flashSha}
                commitBySha={commitBySha}
                childrenBySha={childrenBySha}
                matchShas={search.result.shas}
                query={search.query}
                rowHandlers={popups.rowHandlers}
                paging={paging}
              />
              <GraphStatusBar
                loadedCount={viewCommits.length + (seek?.buffer.length ?? 0)}
                hasMore={ready.hasMore}
                refreshing={ready.refreshing}
                pendingNotice={pendingNotice}
                retry={retry}
              />
              {seek && selectedSha ? (
                <SeekBanner
                  target={describeJumpTarget(ready.view, selectedSha)}
                  scanned={ready.rawCommits.length + seek.buffer.length}
                  total={ready.meta.dates.length}
                  onCancel={handleCancelSeek}
                />
              ) : null}
            </>
          ) : state.status === 'error' ? (
            <ErrorState
              kind={state.kind}
              message={state.message}
              owner={owner}
              repo={repo}
              onRetry={handleRefresh}
            />
          ) : null}
        </div>
        <DetailPanel layout={detailLayout} panelRef={detailRef} hasSelection={selectedSha !== null}>
          <CommitDetail
            commit={selectedCommit}
            owner={owner}
            repo={repo}
            childrenShas={selectedChildren}
            containingRefs={containingRefs}
            onCopy={copy}
            onCopyLink={copyLink}
            onSelectSha={setSelectedSha}
          />
        </DetailPanel>
      </div>

      <Toast toast={toast} />
      <GraphPopups popups={popups} />
    </div>
  );
}
