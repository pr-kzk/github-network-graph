import { memo, useMemo } from 'react';
import { laneColor } from '../lib/colors';
import { buildEdgeIndex, edgesInRows } from '../lib/edgeIndex';
import { snapToRowWindow } from '../lib/graphWindow';
import { edgeEmphasis } from '../lib/laneBudget';
import { NODE_RADIUS, ROW_HEIGHT, rowY, type GraphLayout } from '../lib/graphMetrics';
import type { GraphView, ViewCommit, ViewEdge } from '../lib/transform.types';

const FOLDED_NODE_RADIUS = 2.5;
const FOLDED_DASH = '2 3';

type GraphCanvasProps = {
  view: GraphView;
  selectedSha: string | null;
  pathShas: ReadonlySet<string> | null;
  layout: GraphLayout;
  rangeStart: number;
  rangeEnd: number;
};

function renderEdge(edge: ViewEdge, layout: GraphLayout, pathShas: ReadonlySet<string> | null) {
  const fromFolded = layout.isFolded(edge.fromLane);
  const toFolded = layout.isFolded(edge.toLane);
  const onPath = pathShas !== null && pathShas.has(edge.fromSha) && pathShas.has(edge.toSha);
  if (fromFolded && toFolded && !onPath) return null;
  const x1 = layout.laneX(edge.fromLane);
  const y1 = rowY(edge.fromRow);
  const x2 = layout.laneX(edge.toLane);
  const y2 = rowY(edge.toRow);
  const colorLane = edge.isMerge ? edge.fromLane : edge.toLane;
  const stroke = laneColor(
    layout.isFolded(colorLane) ? (fromFolded ? edge.toLane : edge.fromLane) : colorLane,
  );
  const { opacity, width } = edgeEmphasis({
    crowded: layout.crowded,
    hasSelection: pathShas !== null,
    onPath,
    priority: layout.isPriority(edge.fromLane) || layout.isPriority(edge.toLane),
  });
  const dash = !onPath && (fromFolded || toFolded) ? FOLDED_DASH : undefined;
  const key = `${edge.fromSha}-${edge.toSha}`;
  if (x1 === x2) {
    return (
      <line
        key={key}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={stroke}
        strokeWidth={width}
        strokeOpacity={opacity}
        strokeDasharray={dash}
        strokeLinecap="round"
      />
    );
  }
  const goingDown = y2 > y1;
  const curveStart = goingDown ? Math.max(y1, y2 - ROW_HEIGHT) : Math.min(y1, y2 + ROW_HEIGHT);
  const d = `M ${x1} ${y1} L ${x1} ${curveStart} C ${x1} ${y2}, ${x2} ${curveStart}, ${x2} ${y2}`;
  return (
    <path
      key={key}
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeOpacity={opacity}
      strokeDasharray={dash}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function renderNode(
  commit: ViewCommit,
  layout: GraphLayout,
  selectedSha: string | null,
  pathShas: ReadonlySet<string> | null,
) {
  const isSelected = commit.sha === selectedSha;
  const folded = layout.isFolded(commit.lane);
  const onPath = pathShas?.has(commit.sha) ?? false;
  const { opacity } = edgeEmphasis({
    crowded: layout.crowded,
    hasSelection: pathShas !== null,
    onPath: onPath || isSelected,
    priority: layout.isPriority(commit.lane),
  });
  const radius = isSelected
    ? NODE_RADIUS + 1.5
    : folded && !onPath
      ? FOLDED_NODE_RADIUS
      : NODE_RADIUS;
  return (
    <circle
      key={commit.sha}
      cx={layout.laneX(commit.lane)}
      cy={rowY(commit.row)}
      r={radius}
      fill={laneColor(commit.lane)}
      opacity={folded && !onPath ? Math.min(opacity, 0.6) : opacity}
      stroke={isSelected ? 'var(--graph-node-stroke-selected)' : 'var(--graph-node-stroke)'}
      strokeWidth={isSelected ? 2.5 : 2}
    />
  );
}

type GraphWindowProps = Omit<GraphCanvasProps, 'rangeStart' | 'rangeEnd'> & {
  start: number;
  end: number;
};

// A hit target per node was not kept: the row buttons already cover the whole graph column,
// so hover, click and the context menu reach the same commit without doubling the elements.
const GraphWindow = memo(function GraphWindow({
  view,
  selectedSha,
  pathShas,
  layout,
  start,
  end,
}: GraphWindowProps) {
  const edgeIndex = useMemo(() => buildEdgeIndex(view.edges), [view.edges]);
  const top = start * ROW_HEIGHT;
  const height = (end - start) * ROW_HEIGHT;

  const edges = useMemo(
    () => edgesInRows(edgeIndex, start, end).map((edge) => renderEdge(edge, layout, pathShas)),
    [edgeIndex, start, end, layout, pathShas],
  );
  const nodes = useMemo(
    () =>
      view.commits
        .slice(start, end)
        .map((commit) => renderNode(commit, layout, selectedSha, pathShas)),
    [view.commits, start, end, layout, selectedSha, pathShas],
  );

  return (
    <svg
      width={layout.width}
      height={height}
      viewBox={`0 ${top} ${layout.width} ${height}`}
      preserveAspectRatio="none"
      shapeRendering="geometricPrecision"
      className="pointer-events-none absolute left-0 z-10"
      style={{ top }}
    >
      {layout.foldedCount > 0 ? (
        <line
          x1={layout.gutterX}
          y1={top}
          x2={layout.gutterX}
          y2={top + height}
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="1 5"
          className="text-slate-400 dark:text-slate-600"
        />
      ) : null}
      <g>{edges}</g>
      <g>{nodes}</g>
    </svg>
  );
});

export function GraphCanvas({ rangeStart, rangeEnd, view, ...rest }: GraphCanvasProps) {
  const { start, end } = snapToRowWindow(rangeStart, rangeEnd, view.commits.length);
  return <GraphWindow view={view} start={start} end={end} {...rest} />;
}
