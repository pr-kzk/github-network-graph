const WINDOW_ROWS = 48;

type RowWindow = { start: number; end: number };

// Following the rendered rows exactly would rebuild every edge and node on each scrolled row;
// snapping to whole blocks keeps the drawn shapes untouched until the rows cross a block boundary.
export function snapToRowWindow(rangeStart: number, rangeEnd: number, rowCount: number): RowWindow {
  return {
    start: Math.floor(Math.max(0, rangeStart) / WINDOW_ROWS) * WINDOW_ROWS,
    end: Math.min(rowCount, Math.ceil(rangeEnd / WINDOW_ROWS) * WINDOW_ROWS),
  };
}
