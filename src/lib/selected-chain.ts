import type { TreeNode } from "@/types/visualizer";
import { tokenToWordHelper } from "@/lib/token-display";

export interface ChainPreviewResult {
  state: "empty" | "valid" | "hypothetical";
  message?: string;
  selectedCount: number;
  selectedTokensText: string;
  selectedChainProbability: number;
  fullPathProbability: number;
}

function product(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((accumulator, value) => accumulator * value, 1);
}

function previewTextFromNodes(nodes: TreeNode[]): string {
  return nodes
    .map((node) => tokenToWordHelper(node.token))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function computeSelectedChainPreview(
  nodes: TreeNode[],
  selectedNodeIds: string[],
): ChainPreviewResult {
  if (selectedNodeIds.length === 0) {
    return {
      state: "empty",
      selectedCount: 0,
      selectedTokensText: "",
      selectedChainProbability: 0,
      fullPathProbability: 0,
      message: "Click node boxes to build a custom token chain preview.",
    };
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const selectedNodes = selectedNodeIds
    .map((id) => nodeById.get(id))
    .filter((node): node is TreeNode => Boolean(node))
    .filter((node) => node.id !== "root")
    .sort((a, b) => a.stepIndex - b.stepIndex);

  if (selectedNodes.length === 0) {
    return {
      state: "empty",
      selectedCount: 0,
      selectedTokensText: "",
      selectedChainProbability: 0,
      fullPathProbability: 0,
      message: "Click node boxes to build a custom token chain preview.",
    };
  }

  const steps = selectedNodes.map((node) => node.stepIndex);
  const hasDuplicateStepSelection = new Set(steps).size !== steps.length;

  const deepest = selectedNodes[selectedNodes.length - 1];
  const pathToDeepest: TreeNode[] = [];
  let cursor: TreeNode | undefined = deepest;
  while (cursor) {
    if (cursor.id !== "root") {
      pathToDeepest.push(cursor);
    }
    cursor = cursor.parentId ? nodeById.get(cursor.parentId) : undefined;
  }
  pathToDeepest.reverse();

  const pathIdSet = new Set(pathToDeepest.map((node) => node.id));
  const hasBranchSplitSelection = selectedNodes.some((node) => !pathIdSet.has(node.id));
  const isHypothetical = hasDuplicateStepSelection || hasBranchSplitSelection;

  const selectedTokensText = previewTextFromNodes(selectedNodes);
  const selectedChainProbability = product(
    selectedNodes.map((node) => node.rawProbability ?? node.probability),
  );
  const fullPathProbability = product(
    pathToDeepest.map((node) => node.rawProbability ?? node.probability),
  );

  if (isHypothetical) {
    return {
      state: "hypothetical",
      selectedCount: selectedNodes.length,
      selectedTokensText,
      selectedChainProbability,
      fullPathProbability,
      message:
        "Warning: this selection mixes alternatives that would not normally happen together in one real generation path.",
    };
  }

  return {
    state: "valid",
    selectedCount: selectedNodes.length,
    selectedTokensText,
    selectedChainProbability,
    fullPathProbability,
  };
}
