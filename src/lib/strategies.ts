import { seededRandom } from "@/lib/random";
import type { StrategyParams, StrategyType, TokenCandidate } from "@/types/visualizer";

export interface RawCandidate {
  token: string;
  probability: number;
  logprob?: number;
}

interface WorkingCandidate {
  token: string;
  rawProbability: number;
  logprob?: number;
}

function toWorkingCandidates(candidates: RawCandidate[]): WorkingCandidate[] {
  return candidates.map((candidate) => ({
    token: candidate.token,
    rawProbability: Math.max(candidate.probability, Number.EPSILON),
    logprob: candidate.logprob,
  }));
}

function normalizeByRaw(candidates: WorkingCandidate[]): WorkingCandidate[] {
  const total = candidates.reduce((sum, candidate) => sum + candidate.rawProbability, 0);
  if (total <= 0) {
    const uniform = 1 / Math.max(candidates.length, 1);
    return candidates.map((candidate) => ({
      ...candidate,
      rawProbability: uniform,
    }));
  }
  return candidates.map((candidate) => ({
    ...candidate,
    rawProbability: candidate.rawProbability / total,
  }));
}

function sortCandidates(candidates: WorkingCandidate[]): WorkingCandidate[] {
  return [...candidates].sort((a, b) => b.rawProbability - a.rawProbability);
}

function clampTopK(value: number): number {
  return Math.max(1, Math.min(20, Math.round(value)));
}

function clampTopP(value: number): number {
  return Math.max(0.1, Math.min(1, value));
}

function clampTemperature(value: number): number {
  return Math.max(0.1, Math.min(2, value));
}

function withVisibleProbabilities(candidates: WorkingCandidate[]): TokenCandidate[] {
  const visibleTotal = candidates.reduce((sum, candidate) => sum + candidate.rawProbability, 0);
  return candidates.map((candidate, index) => ({
    token: candidate.token,
    rank: index + 1,
    probability: visibleTotal > 0 ? candidate.rawProbability / visibleTotal : 0,
    visibleProbability: visibleTotal > 0 ? candidate.rawProbability / visibleTotal : 0,
    rawProbability: candidate.rawProbability,
    logprob: candidate.logprob,
  }));
}

function weightedSample(
  candidates: WorkingCandidate[],
  temperature: number,
  random: () => number,
): WorkingCandidate {
  if (candidates.length === 1) {
    return candidates[0];
  }

  const scaled = candidates.map((candidate) => ({
    ...candidate,
    rawProbability: candidate.rawProbability ** (1 / temperature),
  }));
  const normalized = normalizeByRaw(scaled);

  const threshold = random();
  let accumulator = 0;
  for (const candidate of normalized) {
    accumulator += candidate.rawProbability;
    if (threshold <= accumulator) {
      return candidate;
    }
  }
  return normalized[normalized.length - 1];
}

function sliceTopP(candidates: WorkingCandidate[], topP: number): WorkingCandidate[] {
  const result: WorkingCandidate[] = [];
  let cumulative = 0;
  for (const candidate of candidates) {
    result.push(candidate);
    cumulative += candidate.rawProbability;
    if (cumulative >= topP) {
      break;
    }
  }
  return result;
}

export interface StrategyResult {
  candidates: TokenCandidate[];
  selectedToken: string;
}

export interface SelectionOptions {
  previousToken?: string;
  avoidImmediateRepeat?: boolean;
}

function chooseWinningToken(
  candidates: TokenCandidate[],
  options?: SelectionOptions,
): string {
  if (candidates.length === 0) {
    return "";
  }
  if (!options?.avoidImmediateRepeat || !options.previousToken) {
    return candidates[0].token;
  }

  const nonRepeating = candidates.find((candidate) => candidate.token !== options.previousToken);
  return nonRepeating?.token ?? candidates[0].token;
}

export function applySelectionStrategy(
  rawCandidates: RawCandidate[],
  strategy: StrategyType,
  params: StrategyParams,
  seedInput: string,
  options?: SelectionOptions,
): StrategyResult {
  const rankedGlobal = sortCandidates(normalizeByRaw(toWorkingCandidates(rawCandidates)));

  if (rankedGlobal.length === 0) {
    return {
      candidates: [],
      selectedToken: "",
    };
  }

  if (strategy === "top_k") {
    const shortlist = rankedGlobal.slice(0, clampTopK(params.topK));
    const candidates = withVisibleProbabilities(shortlist);
    return {
      candidates,
      selectedToken: chooseWinningToken(candidates, options),
    };
  }

  if (strategy === "top_p") {
    const shortlist = sliceTopP(rankedGlobal, clampTopP(params.topP));
    const candidates = withVisibleProbabilities(shortlist);
    return {
      candidates,
      selectedToken: chooseWinningToken(candidates, options),
    };
  }

  const shortlist = rankedGlobal.slice(0, clampTopK(params.topK));
  const temperature = clampTemperature(params.temperature);
  const random = seededRandom(seedInput);
  const chosen = weightedSample(shortlist, temperature, random);
  const candidates = withVisibleProbabilities(shortlist);

  return {
    candidates,
    selectedToken: chosen.token,
  };
}
