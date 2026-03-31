import { computeLayout } from "@/lib/layout";
import type { TreeEdge, TreeNode } from "@/types/visualizer";

const nodes: TreeNode[] = [
  {
    id: "root",
    parentId: null,
    token: "prompt",
    probability: 1,
    rank: 1,
    stepIndex: 0,
    status: "active",
  },
  {
    id: "a",
    parentId: "root",
    token: " A",
    probability: 0.5,
    rank: 1,
    stepIndex: 1,
    status: "selected",
  },
  {
    id: "b",
    parentId: "root",
    token: " B",
    probability: 0.5,
    rank: 2,
    stepIndex: 1,
    status: "truncated",
  },
  {
    id: "c",
    parentId: "a",
    token: " C",
    probability: 0.6,
    rank: 1,
    stepIndex: 2,
    status: "active",
  },
];

const edges: TreeEdge[] = [
  { id: "e1", source: "root", target: "a", status: "selected" },
  { id: "e2", source: "root", target: "b", status: "truncated" },
  { id: "e3", source: "a", target: "c", status: "selected" },
];

describe("computeLayout", () => {
  it("positions nodes in layered LR mode", () => {
    const layout = computeLayout(nodes, edges, "layered_lr");
    expect(layout.root.x).toBeLessThan(layout.a.x);
    expect(layout.a.x).toBeLessThan(layout.c.x);
  });

  it("positions nodes top-down in TB mode", () => {
    const layout = computeLayout(nodes, edges, "top_down");
    expect(layout.root.y).toBeLessThan(layout.a.y);
    expect(layout.a.y).toBeLessThan(layout.c.y);
  });

  it("positions same-depth nodes on radial ring", () => {
    const layout = computeLayout(nodes, edges, "radial");
    const root = layout.root;
    const a = layout.a;
    const b = layout.b;
    const distA = Math.hypot(a.x - root.x, a.y - root.y);
    const distB = Math.hypot(b.x - root.x, b.y - root.y);
    expect(Math.abs(distA - distB)).toBeLessThan(2);
  });
});

