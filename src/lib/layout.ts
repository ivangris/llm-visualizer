import dagre from "dagre";

import type { LayoutMode, TreeEdge, TreeNode } from "@/types/visualizer";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 96;

export interface PositionedNode {
  id: string;
  x: number;
  y: number;
}

export function computeLayout(
  nodes: TreeNode[],
  edges: TreeEdge[],
  layoutMode: LayoutMode,
): Record<string, { x: number; y: number }> {
  if (layoutMode === "layered_lr") {
    return layeredStraightLayout(nodes);
  }
  if (layoutMode === "radial") {
    return radialLayout(nodes, edges);
  }
  return dagreLayout(nodes, edges, "TB");
}

function layeredStraightLayout(nodes: TreeNode[]): Record<string, { x: number; y: number }> {
  const positionMap: Record<string, { x: number; y: number }> = {};
  const byStep = new Map<number, TreeNode[]>();

  for (const node of nodes) {
    const current = byStep.get(node.stepIndex) ?? [];
    current.push(node);
    byStep.set(node.stepIndex, current);
  }

  const horizontalGap = 320;
  const verticalGap = 200;

  const steps = [...byStep.keys()].sort((a, b) => a - b);
  for (const step of steps) {
    const nodesAtStep = byStep.get(step) ?? [];
    const mainNode =
      nodesAtStep.find((node) => node.status === "active" || node.status === "selected") ??
      nodesAtStep[0];
    const rest = nodesAtStep
      .filter((node) => node.id !== mainNode.id)
      .sort((a, b) => a.rank - b.rank);

    const ordered = [mainNode, ...rest];
    ordered.forEach((node, index) => {
      if (index === 0) {
        positionMap[node.id] = {
          x: step * horizontalGap,
          y: 0,
        };
        return;
      }

      const depth = Math.ceil(index / 2);
      const direction = index % 2 === 1 ? -1 : 1;
      positionMap[node.id] = {
        x: step * horizontalGap,
        y: direction * depth * verticalGap,
      };
    });
  }

  return positionMap;
}

function dagreLayout(
  nodes: TreeNode[],
  edges: TreeEdge[],
  rankDirection: "LR" | "TB",
): Record<string, { x: number; y: number }> {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: rankDirection,
    ranksep: 150,
    nodesep: 110,
  });

  nodes.forEach((node) => {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  const positionMap: Record<string, { x: number; y: number }> = {};
  nodes.forEach((node) => {
    const computed = graph.node(node.id);
    positionMap[node.id] = {
      x: (computed?.x ?? 0) - NODE_WIDTH / 2,
      y: (computed?.y ?? 0) - NODE_HEIGHT / 2,
    };
  });

  return positionMap;
}

function radialLayout(
  nodes: TreeNode[],
  edges: TreeEdge[],
): Record<string, { x: number; y: number }> {
  const positionMap: Record<string, { x: number; y: number }> = {};
  if (nodes.length === 0) {
    return positionMap;
  }

  const childrenByParent = new Map<string, string[]>();
  const rootId = nodes.find((node) => node.parentId === null)?.id ?? nodes[0].id;
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  edges.forEach((edge) => {
    const children = childrenByParent.get(edge.source) ?? [];
    children.push(edge.target);
    childrenByParent.set(edge.source, children);
  });

  const levels = new Map<number, string[]>();
  const queue: Array<{ id: string; depth: number }> = [{ id: rootId, depth: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current.id)) {
      continue;
    }
    visited.add(current.id);
    const levelNodes = levels.get(current.depth) ?? [];
    levelNodes.push(current.id);
    levels.set(current.depth, levelNodes);

    const children = childrenByParent.get(current.id) ?? [];
    for (const child of children) {
      queue.push({ id: child, depth: current.depth + 1 });
    }
  }

  // Include disconnected nodes if a malformed graph appears.
  nodes.forEach((node) => {
    if (visited.has(node.id)) {
      return;
    }
    const depth = node.stepIndex;
    const levelNodes = levels.get(depth) ?? [];
    levelNodes.push(node.id);
    levels.set(depth, levelNodes);
  });

  const radiusStep = 220;
  const centerOffset = 700;

  levels.forEach((nodeIds, depth) => {
    if (depth === 0) {
      const id = nodeIds[0];
      positionMap[id] = {
        x: centerOffset - NODE_WIDTH / 2,
        y: centerOffset - NODE_HEIGHT / 2,
      };
      return;
    }

    const count = nodeIds.length;
    const radius = radiusStep * depth;
    const angleStep = (Math.PI * 2) / Math.max(count, 1);

    nodeIds.forEach((id, index) => {
      const node = nodeById.get(id);
      const baseAngle = angleStep * index;
      const jitter = ((node?.rank ?? 1) - 1) * 0.03;
      const angle = baseAngle + jitter;
      positionMap[id] = {
        x: centerOffset + Math.cos(angle) * radius - NODE_WIDTH / 2,
        y: centerOffset + Math.sin(angle) * radius - NODE_HEIGHT / 2,
      };
    });
  });

  return positionMap;
}
