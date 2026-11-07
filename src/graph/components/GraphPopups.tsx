import type { GraphPopupsState } from '../hooks/useGraphPopups';
import { CommitContextMenu } from './CommitContextMenu';
import { CommitTooltip } from './CommitTooltip';
import { ShortcutsDialog } from './ShortcutsDialog';

export function GraphPopups({ popups }: { popups: GraphPopupsState }) {
  const { tooltip, ctx, shortcutsOpen, closeShortcuts } = popups;
  return (
    <>
      {tooltip.commit ? <CommitTooltip commit={tooltip.commit} pointer={tooltip.pointer} /> : null}
      {ctx.menu && ctx.menuItems.length > 0 ? (
        <CommitContextMenu
          x={ctx.menu.x}
          y={ctx.menu.y}
          items={ctx.menuItems}
          onClose={ctx.closeMenu}
        />
      ) : null}
      {shortcutsOpen ? <ShortcutsDialog onClose={closeShortcuts} /> : null}
    </>
  );
}
