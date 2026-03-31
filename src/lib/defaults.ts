import type { VisualizationConfig } from "@/types/visualizer";

export const DEFAULT_CONFIG: VisualizationConfig = {
  prompt: "Explain how an LLM works.",
  provider: "openai",
  model: "gpt-4o-mini",
  strategy: "top_k",
  strategyParams: {
    topK: 5,
    topP: 0.85,
    temperature: 0.8,
  },
  maxDepth: 20,
  speed: 1,
  layoutMode: "layered_lr",
  autoFocus: true,
  accuracyMode: true,
  openAIApiKey: "",
};

export const PRESET_STORAGE_KEY = "llm_visualizer_presets_v1";
export const TEACHING_PRESET_NAME = "Teaching Mode";
