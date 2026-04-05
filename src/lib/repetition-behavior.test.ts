import { applySelectionStrategy, type RawCandidate } from "@/lib/strategies";

const RAW_CANDIDATES: RawCandidate[] = [
  { token: " An", probability: 0.52 },
  { token: " LLM", probability: 0.2 },
  { token: " model", probability: 0.13 },
  { token: " works", probability: 0.1 },
  { token: ".", probability: 0.05 },
];

function simulateSelections(strategy: "top_k" | "top_p" | "temperature", steps: number): string[] {
  const selections: string[] = [];
  let prefixTokens: string[] = [];

  for (let step = 0; step < steps; step += 1) {
    const result = applySelectionStrategy(
      RAW_CANDIDATES,
      strategy,
      { topK: 5, topP: 0.9, temperature: 0.8 },
      `openai-${prefixTokens.length}-${prefixTokens.join("|")}`,
      {
        previousToken:
          prefixTokens.length > 0 ? prefixTokens[prefixTokens.length - 1] : undefined,
        avoidImmediateRepeat: true,
      },
    );
    selections.push(result.selectedToken);
    prefixTokens = [...prefixTokens, result.selectedToken];
  }

  return selections;
}

describe("repetition behavior", () => {
  it("avoids immediate token repeats when repeat-avoid is enabled", () => {
    const selections = simulateSelections("temperature", 12);
    const hasImmediateRepeat = selections.some(
      (token, index) => index > 0 && token === selections[index - 1],
    );
    expect(hasImmediateRepeat).toBe(false);
  });
});
