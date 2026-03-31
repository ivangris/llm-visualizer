import { applySelectionStrategy, type RawCandidate } from "@/lib/strategies";
import { seededRandom } from "@/lib/random";
import type {
  NextStepResponse,
  ProviderAdapter,
  StartRunResponse,
  VisualizationConfig,
} from "@/types/visualizer";

const MOCK_VOCABULARY = [
  " AI",
  " systems",
  " can",
  " learn",
  " by",
  " predicting",
  " tokens",
  " from",
  " context",
  " and",
  " probability",
  " distributions",
  " over",
  " a",
  " vocabulary",
  ".",
  ",",
  " which",
  " makes",
  " this",
  " tree",
  " branch",
  " when",
  " alternatives",
  " appear",
  " next",
  " in",
  " sequence",
  " because",
  " each",
  " step",
  " depends",
  " on",
  " previous",
  " choices",
  " across",
  " the",
  " prompt",
  " model",
  " confidence",
  " inference",
  " visualization",
  " teaching",
  " video",
  " locally",
  " scalable",
  " robust",
  " interactive",
  " explainable",
  " panning",
  " radial",
  " topology",
  " deterministic",
  " dynamic",
  " attention",
  " weighted",
  " sampling",
  " temperature",
  " nucleus",
  " beam",
];

const runs = new Map<string, VisualizationConfig>();

function buildMockCandidates(prefixTokens: string[], config: VisualizationConfig): RawCandidate[] {
  const contextKey = `${config.prompt}|${prefixTokens.join("")}|mock`;
  const random = seededRandom(contextKey);
  const vocabulary = [...MOCK_VOCABULARY];
  const raw: RawCandidate[] = vocabulary.map((token, index) => {
    const lexicalBias = 1 - index / vocabulary.length;
    const score = 0.35 * lexicalBias + random();
    return {
      token,
      probability: Math.max(score, Number.EPSILON),
    };
  });
  return raw;
}

async function startRun(config: VisualizationConfig): Promise<StartRunResponse> {
  const runId = crypto.randomUUID();
  runs.set(runId, config);
  return { runId };
}

async function nextStep(
  runId: string,
  prefixTokens: string[],
  config: VisualizationConfig,
): Promise<NextStepResponse> {
  const runConfig = runs.get(runId) ?? config;
  const seedInput = `mock-${prefixTokens.length}-${prefixTokens.join("|")}`;
  const rawCandidates = buildMockCandidates(prefixTokens, runConfig);
  const result = applySelectionStrategy(
    rawCandidates,
    runConfig.strategy,
    runConfig.strategyParams,
    seedInput,
  );

  return {
    candidates: result.candidates,
    selectedToken: result.selectedToken,
    done: result.selectedToken === "" || prefixTokens.length + 1 >= runConfig.maxDepth,
  };
}

export const mockProvider: ProviderAdapter = {
  startRun,
  nextStep,
  async listModels() {
    return ["mock-teaching-v1"];
  },
  async health() {
    return { ok: true };
  },
};
