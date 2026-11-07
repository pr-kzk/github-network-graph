import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { t, tWith } from '@/shared/i18n';
import { recordRecentRepo } from '@/shared/storage';
import { trackEvent } from '@/shared/telemetry';
import { useTheme } from '@/shared/useTheme';
import { CommitContextMenu } from './components/CommitContextMenu';
import { CommitDetail } from './components/CommitDetail';
import { CommitTooltip } from './components/CommitTooltip';
import { DetailPanel } from './components/DetailPanel';
import { ErrorState } from './components/ErrorState';
import { GraphHeader } from './components/GraphHeader';
import { GraphList } from './components/GraphList';
import { GraphSkeleton } from './components/GraphSkeleton';
import { GraphStatusBar } from './components/GraphStatusBar';
import { RepoPrompt } from './components/RepoPrompt';
import { SeekBanner } from './components/SeekBanner';
import { ShortcutsDialog } from './components/ShortcutsDialog';
import { Toast } from './components/Toast';
import { useChildrenIndex } from './hooks/useChildrenIndex';
import { useCommitContextMenu } from './hooks/useCommitContextMenu';
import { useCommitSearch } from './hooks/useCommitSearch';
import { useCommitTooltip } from './hooks/useCommitTooltip';
import { useCopyToClipboard } from './hooks/useCopyToClipboard';
import { useDetailLayout } from './hooks/useDetailLayout';
import { useRepoDocumentTitle } from './hooks/useDocumentTitle';
import { useFocusRequests } from './hooks/useFocusRequests';
import { useGraphData } from './hooks/useGraphData';
import { useGraphKeyboard } from './hooks/useGraphKeyboard';
import { useGraphUrlState } from './hooks/useGraphUrlState';
import { useJumpFeedback } from './hooks/useJumpFeedback';
import { useResolveSelectedCommit } from './hooks/useResolveSelectedCommit';
import { useToast } from './hooks/useToast';
import { findContainingRefs } from './lib/containingRefs';
import type { GraphUrlState } from './lib/graphUrlState';
import { describeJumpTarget } from './lib/jumpTarget';
import type { RepoRef } from './lib/parseUrl';
import type { GraphBranch, GraphForkBranches, ViewCommit } from './lib/transform.types';

const EMPTY_COMMITS: ViewCommit[] = [];
const EMPTY_SHAS: string[] = [];
const EMPTY_BRANCHES: GraphBranch[] = [];
const EMPTY_FORK_BRANCHES: GraphForkBranches[] = [];
const PENDING_NOTICE_ATTEMPTS = 3;
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
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
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

  const commitBySha = useMemo(() => {
    const map = new Map<string, ViewCommit>();
    for (const c of viewCommits) map.set(c.sha, c);
    return map;
  }, [viewCommits]);

  const childrenBySha = useChildrenIndex(viewCommits);

  const selectedCommit = selectedSha ? (commitBySha.get(selectedSha) ?? null) : null;

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

  const selectedChildren = useMemo(
    () => (selectedCommit ? (childrenBySha.get(selectedCommit.sha) ?? EMPTY_SHAS) : EMPTY_SHAS),
    [selectedCommit, childrenBySha],
  );

  const containingRefs = useMemo(
    () =>
      selectedCommit ? findContainingRefs(selectedCommit.sha, commitBySha, childrenBySha) : [],
    [selectedCommit, commitBySha, childrenBySha],
  );

  const handleSelectedCommitNotFound = useCallback(() => {
    setSelectedSha(null);
    showToast('error', t('toast_commit_not_found'));
  }, [setSelectedSha, showToast]);
  const handleSelectedCommitHiddenByMode = useCallback(() => {
    setSelectedSha(null);
    showToast('error', t('toast_commit_hidden_by_mode'));
  }, [setSelectedSha, showToast]);
  useResolveSelectedCommit({
    state,
    isLoaded: selectedSha !== null && commitBySha.has(selectedSha),
    selectedSha,
    seekTo,
    cancelSeek,
    onNotFound: handleSelectedCommitNotFound,
    onHiddenByMode: handleSelectedCommitHiddenByMode,
  });

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

  const ctx = useCommitContextMenu({
    commitBySha,
    owner,
    repo,
    onSelectSha: setSelectedSha,
    onCopy: copy,
    onCopyLink: copyLink,
  });
  const tooltip = useCommitTooltip(commitBySha, ctx.menu !== null);
  const { onLeave: hideTooltip } = tooltip;
  const { openMenu } = ctx;
  const handleContextCommit = useCallback(
    (sha: string, x: number, y: number) => {
      hideTooltip();
      openMenu(sha, x, y);
    },
    [hideTooltip, openMenu],
  );

  const search = useCommitSearch({
    scope: `${owner}/${repo}`,
    commits: viewCommits,
    commitBySha,
    selectedSha,
    onSelect: setSelectedSha,
  });

  const showShortcuts = useCallback(() => {
    trackEvent('shortcuts_open');
    setShortcutsOpen(true);
  }, []);
  const closeShortcuts = useCallback(() => setShortcutsOpen(false), []);

  useGraphKeyboard({
    commits: viewCommits,
    commitBySha,
    childrenBySha,
    selectedSha,
    onSelect: setSelectedSha,
    onFocusDetail: () => {
      detailLayout.setCollapsed(false);
      detailRef.current?.focus();
    },
    onFocusSearch: () => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    },
    onShowShortcuts: showShortcuts,
  });

  const ready = state.status === 'ready' ? state : null;
  const loading = state.status === 'loading' || state.status === 'idle';
  const pendingAttempts =
    state.status === 'loading' || state.status === 'ready' ? state.pendingAttempts : 0;
  const pendingNotice = pendingAttempts >= PENDING_NOTICE_ATTEMPTS;
  const retry = state.status === 'loading' || state.status === 'ready' ? state.retry : null;

  return (
    <div className="flex h-screen flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <GraphHeader
        owner={owner}
        repo={repo}
        mode={mode}
        branches={ready ? ready.view.branches : EMPTY_BRANCHES}
        forkBranches={ready ? ready.view.forkBranches : EMPTY_FORK_BRANCHES}
        refreshing={loading || (ready?.refreshing ?? false)}
        seeking={seek !== null}
        onSwitchRepo={handleSwitchRepo}
        onModeChange={changeMode}
        onRefresh={handleRefresh}
        selectedSha={selectedSha}
        onSelectBranch={setSelectedSha}
        onShowShortcuts={showShortcuts}
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
          ) : state.status === 'error' ? (
            <ErrorState
              kind={state.kind}
              message={state.message}
              owner={owner}
              repo={repo}
              onRetry={handleRefresh}
            />
          ) : (
            <>
              <GraphList
                view={state.view}
                selectedSha={selectedSha}
                flashSha={flashSha}
                commitBySha={commitBySha}
                childrenBySha={childrenBySha}
                matchShas={search.result.shas}
                query={search.query}
                onSelect={handleSelectCommit}
                onHoverCommit={tooltip.onHover}
                onKeyboardFocusCommit={tooltip.onFocus}
                onLeaveCommit={tooltip.onLeave}
                onContextCommit={handleContextCommit}
                hasMore={state.hasMore}
                loadingMore={state.loadingMore}
                olderError={state.olderError}
                onLoadMore={loadMore}
              />
              <GraphStatusBar
                loadedCount={viewCommits.length + (seek?.buffer.length ?? 0)}
                hasMore={state.hasMore}
                refreshing={state.refreshing}
                pendingNotice={pendingNotice}
                retry={retry}
              />
              {seek && selectedSha ? (
                <SeekBanner
                  target={describeJumpTarget(state.view, selectedSha)}
                  scanned={state.rawCommits.length + seek.buffer.length}
                  total={state.meta.dates.length}
                  onCancel={handleCancelSeek}
                />
              ) : null}
            </>
          )}
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
            onParentClick={setSelectedSha}
            onChildClick={setSelectedSha}
            onRefClick={setSelectedSha}
          />
        </DetailPanel>
      </div>

      <Toast toast={toast} />
      {tooltip.commit && tooltip.anchor ? (
        <CommitTooltip commit={tooltip.commit} x={tooltip.anchor.x} y={tooltip.anchor.y} />
      ) : null}
      {ctx.menu && ctx.menuItems.length > 0 ? (
        <CommitContextMenu
          x={ctx.menu.x}
          y={ctx.menu.y}
          items={ctx.menuItems}
          onClose={ctx.closeMenu}
        />
      ) : null}
      {shortcutsOpen ? <ShortcutsDialog onClose={closeShortcuts} /> : null}
    </div>
  );
}
