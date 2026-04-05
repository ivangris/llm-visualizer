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
  recentTokens?: string[];
  avoidTwoTokenLoop?: boolean;
  recentTokenWindow?: number;
  avoidRecentTokenReuse?: boolean;
}

function normalizeTokenForRepeatCheck(token: string): string {
  return token
    .replace(/Ä |â–|Ġ|▁/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function applyImmediateRepeatAvoidance(
  candidates: WorkingCandidate[],
  options?: SelectionOptions,
): WorkingCandidate[] {
  if (!options?.avoidImmediateRepeat || !options.previousToken) {
    return candidates;
  }
  const previous = normalizeTokenForRepeatCheck(options.previousToken);
  const filtered = candidates.filter(
    (candidate) => normalizeTokenForRepeatCheck(candidate.token) !== previous,
  );
  return filtered.length > 0 ? filtered : candidates;
}

function applyTwoTokenLoopAvoidance(
  candidates: WorkingCandidate[],
  options?: SelectionOptions,
): WorkingCandidate[] {
  if (!options?.avoidTwoTokenLoop || !options.recentTokens || options.recentTokens.length < 3) {
    return candidates;
  }

  const recent = options.recentTokens.map(normalizeTokenForRepeatCheck);
  const thirdFromEnd = recent[recent.length - 3];
  const secondFromEnd = recent[recent.length - 2];
  const last = recent[recent.length - 1];

  // Detect A-B-A and avoid selecting B again (which would create A-B-A-B).
  if (!thirdFromEnd || !secondFromEnd || !last || thirdFromEnd !== last || secondFromEnd === last) {
    return candidates;
  }

  const filtered = candidates.filter(
    (candidate) => normalizeTokenForRepeatCheck(candidate.token) !== secondFromEnd,
  );
  return filtered.length > 0 ? filtered : candidates;
}

function applyRecentTokenReuseAvoidance(
  candidates: WorkingCandidate[],
  options?: SelectionOptions,
): WorkingCandidate[] {
  if (!options?.avoidRecentTokenReuse || !options.recentTokens || options.recentTokens.length === 0) {
    return candidates;
  }

  const windowSize = Math.max(1, Math.min(12, options.recentTokenWindow ?? 4));
  const recentSet = new Set(
    options.recentTokens
      .slice(-windowSize)
      .map(normalizeTokenForRepeatCheck)
      .filter((token) => token.length > 0),
  );

  if (recentSet.size === 0) {
    return candidates;
  }

  const filtered = candidates.filter(
    (candidate) => !recentSet.has(normalizeTokenForRepeatCheck(candidate.token)),
  );
  return filtered.length > 0 ? filtered : candidates;
}

function chooseWinningToken(
  candidates: WorkingCandidate[],
  params: StrategyParams,
  seedInput: string,
  options?: SelectionOptions,
): string {
  if (candidates.length === 0) {
    return "";
  }

  const shortlist = applyImmediateRepeatAvoidance(candidates, options);
  const withoutTwoTokenLoop = applyTwoTokenLoopAvoidance(shortlist, options);
  const withoutRecentReuse = applyRecentTokenReuseAvoidance(withoutTwoTokenLoop, options);
  const random = seededRandom(seedInput);
  const temperature = clampTemperature(params.temperature);
  return weightedSample(withoutRecentReuse, temperature, random).token;
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
      selectedToken: chooseWinningToken(shortlist, params, seedInput, options),
    };
  }

  if (strategy === "top_p") {
    const shortlist = sliceTopP(rankedGlobal, clampTopP(params.topP));
    const candidates = withVisibleProbabilities(shortlist);
    return {
      candidates,
      selectedToken: chooseWinningToken(shortlist, params, seedInput, options),
    };
  }

  const shortlist = rankedGlobal.slice(0, clampTopK(params.topK));
  const selectedToken = chooseWinningToken(shortlist, params, seedInput, options);
  const candidates = withVisibleProbabilities(shortlist);

  return {
    candidates,
    selectedToken,
  };
}
