export type ProviderType = "mock" | "openai" | "hf-local";
export type StrategyType = "top_k" | "top_p" | "temperature";
export type LayoutMode = "layered_lr" | "top_down" | "radial";
export type RunStatus = "idle" | "running" | "completed" | "error";
export type TreeNodeStatus = "root" | "selected" | "active" | "truncated";
export type TreeEdgeStatus = "selected" | "truncated";

export interface StrategyParams {
  topK: number;
  topP: number;
  temperature: number;
}

export interface VisualizationConfig {
  prompt: string;
  provider: ProviderType;
  model: string;
  strategy: StrategyType;
  strategyParams: StrategyParams;
  maxDepth: number;
  speed: number;
  layoutMode: LayoutMode;
  autoFocus: boolean;
  accuracyMode: boolean;
  openAIApiKey: string;
}

export interface TokenCandidate {
  token: string;
  probability: number;
  rawProbability?: number;
  visibleProbability?: number;
  rank: number;
  logprob?: number;
}

export interface NextStepResponse {
  candidates: TokenCandidate[];
  selectedToken: string;
  done: boolean;
}

export interface StartRunResponse {
  runId: string;
}

export interface TreeNode {
  id: string;
  parentId: string | null;
  token: string;
  probability: number;
  rawProbability?: number;
  visibleProbability?: number;
  rank: number;
  stepIndex: number;
  status: TreeNodeStatus;
  assembledText?: string;
}

export interface TreeEdge {
  id: string;
  source: string;
  target: string;
  status: TreeEdgeStatus;
}

export interface VisualizationPreset {
  id: string;
  name: string;
  config: VisualizationConfig;
  createdAt: string;
}

export interface ProviderAdapter {
  startRun(config: VisualizationConfig): Promise<StartRunResponse>;
  nextStep(
    runId: string,
    prefixTokens: string[],
    config: VisualizationConfig,
  ): Promise<NextStepResponse>;
  health?(): Promise<{ ok: boolean; message?: string }>;
  listModels?(): Promise<string[]>;
}
