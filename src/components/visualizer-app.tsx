"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

import { ControlPanel } from "@/components/control-panel";
import { FlowCanvas } from "@/components/flow-canvas";
import { computeSelectedChainPreview } from "@/lib/selected-chain";
import { probabilityToPercent } from "@/lib/token-display";
import { useVisualizerStore } from "@/store/visualizer-store";

export function VisualizerApp() {
  const tree = useVisualizerStore((state) => state.tree);
  const config = useVisualizerStore((state) => state.config);
  const autoPlay = useVisualizerStore((state) => state.autoPlay);
  const runStatus = useVisualizerStore((state) => state.runStatus);
  const recenterNonce = useVisualizerStore((state) => state.recenterNonce);
  const selectedNodeIds = useVisualizerStore((state) => state.selectedNodeIds);
  const toggleNodeSelection = useVisualizerStore((state) => state.toggleNodeSelection);
  const clearNodeSelection = useVisualizerStore((state) => state.clearNodeSelection);
  const stepRun = useVisualizerStore((state) => state.stepRun);
  const loadPresets = useVisualizerStore((state) => state.loadPresets);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  useEffect(() => {
    if (!autoPlay || runStatus !== "running") {
      return;
    }
    const intervalMs = Math.max(250, 1300 / Math.max(config.speed, 0.25));
    const timer = window.setInterval(() => {
      void stepRun();
    }, intervalMs);
    return () => {
      window.clearInterval(timer);
    };
  }, [autoPlay, runStatus, config.speed, stepRun]);

  const chainPreview = computeSelectedChainPreview(tree.nodes, selectedNodeIds);

  return (
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_15%_20%,rgba(6,182,212,0.12),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(244,114,182,0.09),transparent_34%),#09090b] text-zinc-100">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-4 px-4 py-4 lg:px-6">
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 backdrop-blur"
        >
          <h1 className="text-lg font-semibold tracking-wide text-zinc-100">LLM Token Tree Visualizer</h1>
          <p className="text-sm text-zinc-400">
            Visualize next-token probabilities, branching alternatives, and the selected continuation
            path.
          </p>
        </motion.header>

        <div className="grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)]">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05, duration: 0.35 }}
            className="space-y-4"
          >
            <ControlPanel />
          </motion.div>

          <motion.main
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.35 }}
            className="h-[76vh] min-h-[620px] space-y-3"
          >
            <div className="h-[calc(100%-128px)] min-h-[480px]">
              <FlowCanvas
                nodes={tree.nodes}
                edges={tree.edges}
                layoutMode={config.layoutMode}
                accuracyMode={config.accuracyMode}
                autoFocus={config.autoFocus}
                activeNodeId={tree.activeNodeId}
                followActiveStep={autoPlay && runStatus === "running"}
                recenterNonce={recenterNonce}
                selectedNodeIds={selectedNodeIds}
                onToggleNodeSelection={toggleNodeSelection}
              />
            </div>
            <section className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-3 text-xs text-zinc-200">
              <div className="flex items-center justify-between">
                <p className="font-medium text-zinc-100">Selected Path Preview</p>
                <button
                  type="button"
                  onClick={clearNodeSelection}
                  className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 transition hover:border-cyan-500 hover:text-cyan-200"
                >
                  Clear selection
                </button>
              </div>

              {chainPreview.state === "valid" || chainPreview.state === "hypothetical" ? (
                <div className="mt-2 space-y-1">
                  <p className="font-mono text-zinc-100">{chainPreview.selectedTokensText || "(empty)"}</p>
                  <p>
                    Selected chain probability:{" "}
                    <span className="text-cyan-300">
                      {probabilityToPercent(chainPreview.selectedChainProbability)}
                    </span>
                  </p>
                  {chainPreview.state === "valid" ? (
                    <p className="text-zinc-400">
                      Full branch probability to deepest selected node:{" "}
                      {probabilityToPercent(chainPreview.fullPathProbability)}
                    </p>
                  ) : (
                    <p className="text-amber-300">{chainPreview.message}</p>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-zinc-400">{chainPreview.message}</p>
              )}
            </section>
          </motion.main>
        </div>
      </div>
    </div>
  );
}
