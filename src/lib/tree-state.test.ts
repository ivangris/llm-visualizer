import { advanceTree, createInitialTree } from "@/lib/tree-state";

describe("tree-state progression", () => {
  it("keeps one winning branch active and truncates alternatives", () => {
    const initial = createInitialTree("Prompt");
    const advanced = advanceTree(initial, {
      candidates: [
        { token: " A", probability: 0.52, rank: 1 },
        { token: " B", probability: 0.28, rank: 2 },
        { token: " C", probability: 0.2, rank: 3 },
      ],
      selectedToken: " A",
      done: false,
    });

    const activeNodes = advanced.nodes.filter((node) => node.status === "active");
    const truncatedNodes = advanced.nodes.filter((node) => node.status === "truncated");
    expect(activeNodes).toHaveLength(1);
    expect(activeNodes[0].token).toBe(" A");
    expect(truncatedNodes).toHaveLength(2);
    expect(advanced.selectedTokens).toEqual([" A"]);
  });
});

