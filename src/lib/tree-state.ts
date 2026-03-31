import type { NextStepResponse, TreeEdge, TreeNode } from "@/types/visualizer";

export interface TreeSnapshot {
  nodes: TreeNode[];
  edges: TreeEdge[];
  activeNodeId: string;
  selectedTokens: string[];
  stepIndex: number;
}

export function createInitialTree(prompt: string): TreeSnapshot {
  return {
    nodes: [
      {
        id: "root",
        parentId: null,
        token: prompt,
        probability: 1,
        rawProbability: 1,
        visibleProbability: 1,
        rank: 1,
        stepIndex: 0,
        status: "active",
        assembledText: "",
      },
    ],
    edges: [],
    activeNodeId: "root",
    selectedTokens: [],
    stepIndex: 0,
  };
}

function createNodeId(stepIndex: number, rank: number, token: string): string {
  const safeToken = token
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .slice(0, 14);
  return `node_${stepIndex}_${rank}_${safeToken || "token"}`;
}

export function advanceTree(snapshot: TreeSnapshot, payload: NextStepResponse): TreeSnapshot {
  if (payload.candidates.length === 0 || !payload.selectedToken) {
    return snapshot;
  }

  const nodes = snapshot.nodes.map((node) =>
    node.id === snapshot.activeNodeId ? { ...node, status: "selected" as const } : node,
  );
  const edges = [...snapshot.edges];
  const step = snapshot.stepIndex + 1;

  let newActiveId = snapshot.activeNodeId;

  payload.candidates.forEach((candidate) => {
    const isSelected = candidate.token === payload.selectedToken;
    const nodeId = createNodeId(step, candidate.rank, candidate.token);
    const parentNode = snapshot.nodes.find((node) => node.id === snapshot.activeNodeId);
    const parentAssembled = parentNode?.assembledText ?? "";

    nodes.push({
      id: nodeId,
      parentId: snapshot.activeNodeId,
      token: candidate.token,
      probability: candidate.probability,
      rawProbability: candidate.rawProbability ?? candidate.probability,
      visibleProbability: candidate.visibleProbability ?? candidate.probability,
      rank: candidate.rank,
      stepIndex: step,
      status: isSelected ? "active" : "truncated",
      assembledText: `${parentAssembled}${candidate.token}`,
    });

    edges.push({
      id: `edge_${snapshot.activeNodeId}_${nodeId}`,
      source: snapshot.activeNodeId,
      target: nodeId,
      status: isSelected ? "selected" : "truncated",
    });

    if (isSelected) {
      newActiveId = nodeId;
    }
  });

  const selectedTokens = [...snapshot.selectedTokens, payload.selectedToken];

  return {
    nodes,
    edges,
    activeNodeId: newActiveId,
    selectedTokens,
    stepIndex: step,
  };
}
