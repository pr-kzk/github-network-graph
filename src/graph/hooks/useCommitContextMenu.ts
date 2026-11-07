import { useCallback, useMemo, useState } from 'react';
import { t } from '@/shared/i18n';
import type { ContextMenuItem } from '../components/CommitContextMenu';
import type { ViewCommit } from '../lib/transform.types';

export type HoverState = { sha: string; x: number; y: number };
export type MenuState = { sha: string; x: number; y: number };

export type UseCommitContextMenuArgs = {
  commitBySha: Map<string, ViewCommit>;
  owner: string;
  repo: string;
  onSelectSha: (sha: string) => void;
  onCopy: (text: string) => void;
};

export type UseCommitContextMenuResult = {
  hover: HoverState | null;
  menu: MenuState | null;
  hoveredCommit: ViewCommit | null;
  menuItems: ContextMenuItem[];
  showTooltip: boolean;
  handlers: {
    onHoverCommit: (sha: string, x: number, y: number) => void;
    onLeaveCommit: (sha: string) => void;
    onContextCommit: (sha: string, x: number, y: number) => void;
    closeMenu: () => void;
  };
};

export function useCommitContextMenu({
  commitBySha,
  owner,
  repo,
  onSelectSha,
  onCopy,
}: UseCommitContextMenuArgs): UseCommitContextMenuResult {
  const [hover, setHover] = useState<HoverState | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);

  const hoveredCommit = useMemo(
    () => (hover ? (commitBySha.get(hover.sha) ?? null) : null),
    [commitBySha, hover],
  );

  // メニューが開いている間は tooltip を隠す (両方同時に出ると邪魔になる)。
  const showTooltip = Boolean(hoveredCommit) && !menu;

  const onHoverCommit = useCallback((sha: string, x: number, y: number) => {
    setHover({ sha, x, y });
  }, []);
  const onLeaveCommit = useCallback<(sha: string) => void>(() => {
    setHover(null);
  }, []);
  const onContextCommit = useCallback((sha: string, x: number, y: number) => {
    setMenu({ sha, x, y });
    setHover(null);
  }, []);
  const closeMenu = useCallback(() => setMenu(null), []);

  const menuItems = useMemo<ContextMenuItem[]>(() => {
    if (!menu) return [];
    const commit = commitBySha.get(menu.sha);
    if (!commit) return [];
    const commitUrl = `https://github.com/${owner}/${repo}/commit/${commit.sha}`;
    return [
      {
        kind: 'item',
        id: 'open-github',
        label: t('commit_detail_action_open_github'),
        onClick: () => window.open(commitUrl, '_blank', 'noopener'),
      },
      { kind: 'separator', id: 'separator-open' },
      {
        kind: 'item',
        id: 'copy-sha',
        label: t('commit_detail_action_copy_sha'),
        onClick: () => onCopy(commit.sha),
      },
      {
        kind: 'item',
        id: 'copy-short-sha',
        label: t('commit_detail_action_copy_short_sha'),
        onClick: () => onCopy(commit.shortSha),
      },
      {
        kind: 'item',
        id: 'copy-subject',
        label: t('commit_detail_action_copy_subject'),
        onClick: () => onCopy(commit.subject),
        disabled: !commit.subject,
      },
      { kind: 'separator', id: 'separator-copy' },
      {
        kind: 'item',
        id: 'jump-parent',
        label: t('commit_detail_action_jump_parent'),
        onClick: () => onSelectSha(commit.parents[0] ?? commit.sha),
        disabled: commit.parents.length === 0,
      },
    ];
  }, [menu, commitBySha, owner, repo, onSelectSha, onCopy]);

  return {
    hover,
    menu,
    hoveredCommit,
    menuItems,
    showTooltip,
    handlers: {
      onHoverCommit,
      onLeaveCommit,
      onContextCommit,
      closeMenu,
    },
  };
}
