import { useCallback, useMemo, useState } from 'react';
import { trackEvent } from '@/shared/telemetry';
import type { RowHandlers } from '../components/CommitRow';
import type { ViewCommit } from '../lib/transform.types';
import { useCommitContextMenu } from './useCommitContextMenu';
import { useCommitTooltip } from './useCommitTooltip';

type UseGraphPopupsArgs = {
  commitBySha: ReadonlyMap<string, ViewCommit>;
  owner: string;
  repo: string;
  onSelectSha: (sha: string) => void;
  onCopy: (text: string) => void;
  onCopyLink: (sha: string) => void;
  onSelectRow: (sha: string) => void;
};

export function useGraphPopups({
  commitBySha,
  owner,
  repo,
  onSelectSha,
  onCopy,
  onCopyLink,
  onSelectRow,
}: UseGraphPopupsArgs) {
  const ctx = useCommitContextMenu({ commitBySha, owner, repo, onSelectSha, onCopy, onCopyLink });
  const tooltip = useCommitTooltip(commitBySha, ctx.menu !== null);
  const { onHover, onFocus, onLeave } = tooltip;
  const { openMenu } = ctx;

  const rowHandlers = useMemo<RowHandlers>(
    () => ({
      onSelect: onSelectRow,
      onHover,
      onKeyboardFocus: onFocus,
      onLeave,
      onContextMenu: (sha, x, y) => {
        onLeave();
        openMenu(sha, x, y);
      },
    }),
    [onSelectRow, onHover, onFocus, onLeave, openMenu],
  );

  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const showShortcuts = useCallback(() => {
    trackEvent('shortcuts_open');
    setShortcutsOpen(true);
  }, []);
  const closeShortcuts = useCallback(() => setShortcutsOpen(false), []);

  return { tooltip, ctx, rowHandlers, shortcutsOpen, showShortcuts, closeShortcuts };
}

export type GraphPopupsState = ReturnType<typeof useGraphPopups>;
