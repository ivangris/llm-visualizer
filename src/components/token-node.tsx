"use client";

import { Handle, Position, type NodeProps } from "reactflow";

import { formatTokenTokenFirst, probabilityToPercent } from "@/lib/token-display";
import type { TreeNode } from "@/types/visualizer";

interface TokenNodeData {
  node: TreeNode;
  accuracyMode: boolean;
  isSelectedForPreview: boolean;
}

function containerClass(status: TreeNode["status"], isSelectedForPreview: boolean): string {
  if (isSelectedForPreview) {
    return "border-amber-300 bg-amber-500/10 shadow-[0_0_28px_-10px_rgba(252,211,77,0.9)]";
  }
  if (status === "active") {
    return "border-cyan-400 bg-cyan-500/10 shadow-[0_0_36px_-12px_rgba(56,189,248,0.8)]";
  }
  if (status === "truncated") {
    return "border-rose-400/40 bg-rose-400/5 opacity-70";
  }
  if (status === "selected") {
    return "border-zinc-500 bg-zinc-900";
  }
  return "border-zinc-600 bg-zinc-950";
}

export function TokenNode({ data }: NodeProps<TokenNodeData>) {
  const displayToken = formatTokenTokenFirst(data.node.token);
  const rawProbability = data.node.rawProbability ?? data.node.probability;
  const visibleProbability = data.node.visibleProbability ?? data.node.probability;

  return (
    <div
      className={`w-56 rounded-xl border px-3 py-2 text-zinc-50 transition-colors ${containerClass(
        data.node.status,
        data.isSelectedForPreview,
      )}`}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-cyan-300" />
      <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">
        Step {data.node.stepIndex}
      </div>
      <div className="mt-1 font-mono text-[13px]">{displayToken}</div>
      {data.accuracyMode ? (
        <div className="mt-2 space-y-1 text-[11px] text-zinc-300">
          <div className="flex justify-between">
            <span>#{data.node.rank}</span>
            <span>Raw: {probabilityToPercent(rawProbability)}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Shown share</span>
            <span>{probabilityToPercent(visibleProbability)}</span>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex justify-between text-[11px] text-zinc-300">
          <span>#{data.node.rank}</span>
          <span>{probabilityToPercent(data.node.probability)}</span>
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-cyan-300" />
    </div>
  );
}
