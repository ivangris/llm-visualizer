import { computeSelectedChainPreview } from "@/lib/selected-chain";
import type { TreeNode } from "@/types/visualizer";

const BASE_NODE: Omit<TreeNode, "id" | "parentId" | "token" | "stepIndex" | "status"> = {
  probability: 1,
  rawProbability: 1,
  visibleProbability: 1,
  rank: 1,
};

describe("computeSelectedChainPreview", () => {
  it("uses assembled selected-path text for valid chains", () => {
    const nodes: TreeNode[] = [
      {
        ...BASE_NODE,
        id: "root",
        parentId: null,
        token: "Prompt",
        stepIndex: 0,
        status: "active",
        assembledText: "",
      },
      {
        ...BASE_NODE,
        id: "n1",
        parentId: "root",
        token: "An",
        stepIndex: 1,
        status: "selected",
        assembledText: "An",
      },
      {
        ...BASE_NODE,
        id: "n2",
        parentId: "n1",
        token: " LL",
        stepIndex: 2,
        status: "selected",
        assembledText: "An LL",
      },
      {
        ...BASE_NODE,
        id: "n3",
        parentId: "n2",
        token: "M",
        stepIndex: 3,
        status: "active",
        assembledText: "An LLM",
      },
    ];

    const result = computeSelectedChainPreview(nodes, ["n1", "n2", "n3"]);

    expect(result.state).toBe("valid");
    expect(result.selectedTokensText).toBe("An LLM");
  });

  it("normalizes tokenizer marker spacing for hypothetical mixed branches", () => {
    const nodes: TreeNode[] = [
      {
        ...BASE_NODE,
        id: "root",
        parentId: null,
        token: "Prompt",
        stepIndex: 0,
        status: "active",
        assembledText: "",
      },
      {
        ...BASE_NODE,
        id: "a",
        parentId: "root",
        token: "ĠAn",
        stepIndex: 1,
        status: "truncated",
        assembledText: " An",
      },
      {
        ...BASE_NODE,
        id: "b",
        parentId: "root",
        token: "▁LLM",
        stepIndex: 1,
        status: "truncated",
        assembledText: " LLM",
      },
    ];

    const result = computeSelectedChainPreview(nodes, ["a", "b"]);

    expect(result.state).toBe("hypothetical");
    expect(result.selectedTokensText).toBe("An LLM");
  });
});

