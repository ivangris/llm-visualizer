"use client";

import { useEffect, useMemo } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type NodeMouseHandler,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";

import { computeLayout } from "@/lib/layout";
import { TokenNode } from "@/components/token-node";
import type { LayoutMode, TreeEdge, TreeNode } from "@/types/visualizer";

interface FlowCanvasProps {
  nodes: TreeNode[];
  edges: TreeEdge[];
  layoutMode: LayoutMode;
  accuracyMode: boolean;
  autoFocus: boolean;
  activeNodeId: string;
  followActiveStep: boolean;
  recenterNonce: number;
  selectedNodeIds: string[];
  onToggleNodeSelection: (nodeId: string) => void;
}

const nodeTypes = {
  token: TokenNode,
};

function getEdgeStyle(status: TreeEdge["status"]): Edge["style"] {
  if (status === "truncated") {
    return {
      stroke: "rgba(244, 63, 94, 0.45)",
      strokeDasharray: "4 4",
      strokeWidth: 1.4,
    };
  }
  return {
    stroke: "rgba(56, 189, 248, 0.9)",
    strokeWidth: 2.1,
  };
}

function CanvasInner({
  nodes,
  edges,
  layoutMode,
  accuracyMode,
  autoFocus,
  activeNodeId,
  followActiveStep,
  recenterNonce,
  selectedNodeIds,
  onToggleNodeSelection,
}: FlowCanvasProps) {
  const reactFlow = useReactFlow();
  const layout = useMemo(() => computeLayout(nodes, edges, layoutMode), [nodes, edges, layoutMode]);
  const selectedSet = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds]);

  const flowNodes = useMemo<Node[]>(
    () =>
      nodes.map((node) => ({
        id: node.id,
        type: "token",
        data: {
          node,
          accuracyMode,
          isSelectedForPreview: selectedSet.has(node.id),
        },
        position: layout[node.id] ?? { x: 0, y: 0 },
        draggable: false,
      })),
    [nodes, layout, accuracyMode, selectedSet],
  );

  const flowEdges = useMemo<Edge[]>(
    () =>
      edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "smoothstep",
        animated: edge.status === "selected",
        style: getEdgeStyle(edge.status),
      })),
    [edges],
  );

  useEffect(() => {
    if (!autoFocus || followActiveStep) {
      return;
    }
    reactFlow.fitView({
      padding: 0.2,
      duration: 350,
    });
  }, [flowNodes, flowEdges, autoFocus, followActiveStep, reactFlow]);

  useEffect(() => {
    if (!followActiveStep) {
      return;
    }
    const activeNode = flowNodes.find((node) => node.id === activeNodeId);
    if (!activeNode) {
      return;
    }
    reactFlow.setCenter(activeNode.position.x + 110, activeNode.position.y + 48, {
      duration: 260,
      zoom: 1,
    });
  }, [followActiveStep, activeNodeId, flowNodes, reactFlow]);

  useEffect(() => {
    if (recenterNonce === 0) {
      return;
    }
    const root = reactFlow.getNode("root");
    if (!root) {
      return;
    }
    reactFlow.setCenter(root.position.x + 110, root.position.y + 48, {
      zoom: 1,
      duration: 350,
    });
  }, [recenterNonce, reactFlow]);

  const handleNodeClick: NodeMouseHandler = (_, node) => {
    onToggleNodeSelection(node.id);
  };

  return (
    <ReactFlow
      nodes={flowNodes}
      edges={flowEdges}
      nodeTypes={nodeTypes}
      fitView
      panOnDrag
      zoomOnPinch
      zoomOnScroll
      onNodeClick={handleNodeClick}
      proOptions={{ hideAttribution: true }}
      className="bg-transparent"
    >
      <MiniMap
        pannable
        zoomable
        nodeBorderRadius={8}
        nodeStrokeColor="#06b6d4"
        nodeColor="#09090b"
        className="!bg-zinc-950/90 !border !border-zinc-800"
      />
      <Controls className="!bg-zinc-950/95 !border !border-zinc-800 !rounded-lg" />
      <Background color="rgba(148,163,184,0.15)" gap={18} size={1.1} />
    </ReactFlow>
  );
}

export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <div className="relative h-full w-full rounded-2xl border border-zinc-800/80 bg-zinc-950/60 backdrop-blur">
      <ReactFlowProvider>
        <CanvasInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
