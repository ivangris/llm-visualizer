"use client";

import { create } from "zustand";

import { DEFAULT_CONFIG } from "@/lib/defaults";
import { getProviderAdapter } from "@/lib/providers/factory";
import { createPreset, loadPresetsFromStorage, persistPresets } from "@/lib/presets";
import { advanceTree, createInitialTree, type TreeSnapshot } from "@/lib/tree-state";
import type {
  LayoutMode,
  RunStatus,
  VisualizationConfig,
  VisualizationPreset,
} from "@/types/visualizer";

interface VisualizerState {
  config: VisualizationConfig;
  tree: TreeSnapshot;
  runId: string | null;
  runStatus: RunStatus;
  isStepping: boolean;
  autoPlay: boolean;
  errorMessage: string | null;
  hintMessage: string | null;
  selectedInfoTopic: string;
  presets: VisualizationPreset[];
  recenterNonce: number;
  selectedNodeIds: string[];
  selectionMode: "auto" | "manual";
  updateConfig: (patch: Partial<VisualizationConfig>) => void;
  setStrategyParam: (patch: Partial<VisualizationConfig["strategyParams"]>) => void;
  setLayoutMode: (layoutMode: LayoutMode) => void;
  setSelectedInfoTopic: (topic: string) => void;
  loadPresets: () => void;
  savePreset: (name: string) => void;
  deletePreset: (presetId: string) => void;
  applyPreset: (presetId: string) => void;
  toggleAutoPlay: () => void;
  resetRun: () => void;
  startRun: () => Promise<void>;
  stepRun: () => Promise<void>;
  setHintMessage: (message: string | null) => void;
  requestRecenterToStart: () => void;
  toggleNodeSelection: (nodeId: string) => void;
  clearNodeSelection: () => void;
}

function validateLayoutChange(state: VisualizerState): boolean {
  return !(state.runStatus === "running" && state.tree.stepIndex > 0);
}

function deriveChosenPathNodeIds(tree: TreeSnapshot): string[] {
  return tree.nodes
    .filter((node) => node.id !== "root" && (node.status === "selected" || node.status === "active"))
    .sort((a, b) => a.stepIndex - b.stepIndex)
    .map((node) => node.id);
}

export const useVisualizerStore = create<VisualizerState>((set, get) => ({
  config: DEFAULT_CONFIG,
  tree: createInitialTree(DEFAULT_CONFIG.prompt),
  runId: null,
  runStatus: "idle",
  isStepping: false,
  autoPlay: false,
  errorMessage: null,
  hintMessage: null,
  selectedInfoTopic: "overview",
  presets: [],
  recenterNonce: 0,
  selectedNodeIds: [],
  selectionMode: "auto",

  updateConfig: (patch) =>
    set((state) => ({
      config: { ...state.config, ...patch },
    })),

  setStrategyParam: (patch) =>
    set((state) => ({
      config: {
        ...state.config,
        strategyParams: {
          ...state.config.strategyParams,
          ...patch,
        },
      },
    })),

  setLayoutMode: (layoutMode) =>
    set((state) => {
      if (!validateLayoutChange(state)) {
        return {
          hintMessage:
            "Reset the run before switching layout mode to avoid mid-animation topology jitter.",
        };
      }
      return {
        config: { ...state.config, layoutMode },
        hintMessage: null,
      };
    }),

  setSelectedInfoTopic: (topic) => set({ selectedInfoTopic: topic }),

  loadPresets: () => {
    const presets = loadPresetsFromStorage();
    set({ presets });
  },

  savePreset: (name) =>
    set((state) => {
      const trimmed = name.trim();
      if (!trimmed) {
        return { hintMessage: "Preset name cannot be empty." };
      }
      const preset = createPreset(trimmed, state.config);
      const presets = [preset, ...state.presets];
      persistPresets(presets);
      return {
        presets,
        hintMessage: `Saved preset "${trimmed}".`,
      };
    }),

  deletePreset: (presetId) =>
    set((state) => {
      const presets = state.presets.filter((preset) => preset.id !== presetId);
      persistPresets(presets);
      return { presets };
    }),

  applyPreset: (presetId) =>
    set((state) => {
      const preset = state.presets.find((entry) => entry.id === presetId);
      if (!preset) {
        return {};
      }
      return {
        config: {
          ...state.config,
          ...preset.config,
          strategyParams: {
            ...state.config.strategyParams,
            ...preset.config.strategyParams,
          },
        },
        hintMessage: `Loaded preset "${preset.name}".`,
      };
    }),

  toggleAutoPlay: () =>
    set((state) => {
      if (state.runStatus === "completed") {
        return { autoPlay: false };
      }
      return { autoPlay: !state.autoPlay };
    }),

  resetRun: () =>
    set((state) => ({
      tree: createInitialTree(state.config.prompt),
      runId: null,
      runStatus: "idle",
      isStepping: false,
      autoPlay: false,
      errorMessage: null,
      hintMessage: null,
      selectedNodeIds: [],
      selectionMode: "auto",
    })),

  startRun: async () => {
    const state = get();
    try {
      const adapter = getProviderAdapter(state.config.provider);
      set({
        runStatus: "running",
        errorMessage: null,
        hintMessage: null,
        tree: createInitialTree(state.config.prompt),
        selectedNodeIds: [],
        selectionMode: "auto",
      });
      const { runId } = await adapter.startRun(state.config);
      set({
        runId,
      });
    } catch (error) {
      set({
        runStatus: "error",
        autoPlay: false,
        errorMessage: error instanceof Error ? error.message : "Failed to start run.",
      });
    }
  },

  stepRun: async () => {
    const current = get();
    if (current.isStepping) {
      return;
    }

    if (current.runStatus === "idle") {
      await current.startRun();
    }

    const state = get();
    if (state.runStatus !== "running" || !state.runId) {
      return;
    }

    if (state.tree.selectedTokens.length >= state.config.maxDepth) {
      set({
        runStatus: "completed",
        autoPlay: false,
      });
      return;
    }

    set({ isStepping: true, errorMessage: null });
    try {
      const adapter = getProviderAdapter(state.config.provider);
      const response = await adapter.nextStep(state.runId, state.tree.selectedTokens, state.config);
      const tree = advanceTree(state.tree, response);

      const shouldComplete = response.done || tree.selectedTokens.length >= state.config.maxDepth;
      const latestState = get();
      const shouldAutoSelect = latestState.selectionMode === "auto";
      set({
        tree,
        runStatus: shouldComplete ? "completed" : "running",
        autoPlay: shouldComplete ? false : state.autoPlay,
        isStepping: false,
        selectedNodeIds: shouldAutoSelect
          ? deriveChosenPathNodeIds(tree)
          : latestState.selectedNodeIds.filter((nodeId) => tree.nodes.some((node) => node.id === nodeId)),
      });
    } catch (error) {
      set({
        runStatus: "error",
        autoPlay: false,
        isStepping: false,
        errorMessage: error instanceof Error ? error.message : "Failed to generate step.",
      });
    }
  },

  setHintMessage: (message) => set({ hintMessage: message }),

  requestRecenterToStart: () =>
    set((state) => ({
      recenterNonce: state.recenterNonce + 1,
    })),

  toggleNodeSelection: (nodeId) =>
    set((state) => {
      if (nodeId === "root") {
        return state;
      }
      const selected = new Set(state.selectedNodeIds);
      if (selected.has(nodeId)) {
        selected.delete(nodeId);
      } else {
        selected.add(nodeId);
      }
      return {
        selectedNodeIds: Array.from(selected),
        selectionMode: "manual",
      };
    }),

  clearNodeSelection: () => set({ selectedNodeIds: [], selectionMode: "manual" }),
}));
