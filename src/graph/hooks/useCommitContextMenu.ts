import { useCallback, useMemo, useState } from 'react';
import { t } from '@/shared/i18n';
import type { ContextMenuItem } from '../components/CommitContextMenu';
import type { ViewCommit } from '../lib/transform.types';

type MenuState = { sha: string; x: number; y: number };

type UseCommitContextMenuArgs = {
  commitBySha: ReadonlyMap<string, ViewCommit>;
  owner: string;
  repo: string;
  onSelectSha: (sha: string) => void;
  onCopy: (text: string) => void;
  onCopyLink: (sha: string) => void;
};

type UseCommitContextMenuResult = {
  menu: MenuState | null;
  menuItems: ContextMenuItem[];
  openMenu: (sha: string, x: number, y: number) => void;
  closeMenu: () => void;
};

export function useCommitContextMenu({
  commitBySha,
  owner,
  repo,
  onSelectSha,
  onCopy,
  onCopyLink,
}: UseCommitContextMenuArgs): UseCommitContextMenuResult {
  const [menu, setMenu] = useState<MenuState | null>(null);

  const openMenu = useCallback((sha: string, x: number, y: number) => {
    setMenu({ sha, x, y });
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
      {
        kind: 'item',
        id: 'copy-link',
        label: t('commit_detail_action_copy_link'),
        onClick: () => onCopyLink(commit.sha),
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
  }, [menu, commitBySha, owner, repo, onSelectSha, onCopy, onCopyLink]);

  return { menu, menuItems, openMenu, closeMenu };
}
