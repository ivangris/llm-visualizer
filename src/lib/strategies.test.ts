import { applySelectionStrategy } from "@/lib/strategies";

const RAW = [
  { token: " A", probability: 0.45 },
  { token: " B", probability: 0.25 },
  { token: " C", probability: 0.15 },
  { token: " D", probability: 0.1 },
  { token: " E", probability: 0.05 },
];

describe("applySelectionStrategy", () => {
  it("keeps top-k candidates and samples deterministically from shortlist", () => {
    const result = applySelectionStrategy(
      RAW,
      "top_k",
      { topK: 3, topP: 0.9, temperature: 1.1 },
      "seed-a",
    );
    expect(result.candidates).toHaveLength(3);
    expect(result.candidates.some((candidate) => candidate.token === result.selectedToken)).toBe(
      true,
    );
    const repeated = applySelectionStrategy(
      RAW,
      "top_k",
      { topK: 3, topP: 0.9, temperature: 1.1 },
      "seed-a",
    );
    expect(result.selectedToken).toBe(repeated.selectedToken);
    expect(result.candidates[0].rank).toBe(1);
  });

  it("builds nucleus candidates and samples deterministically", () => {
    const result = applySelectionStrategy(
      RAW,
      "top_p",
      { topK: 5, topP: 0.7, temperature: 1.2 },
      "seed-b",
    );
    expect(result.candidates.length).toBeGreaterThanOrEqual(2);
    expect(result.candidates.some((candidate) => candidate.token === result.selectedToken)).toBe(
      true,
    );
    const repeated = applySelectionStrategy(
      RAW,
      "top_p",
      { topK: 5, topP: 0.7, temperature: 1.2 },
      "seed-b",
    );
    expect(result.selectedToken).toBe(repeated.selectedToken);
  });

  it("samples deterministically in temperature mode with same seed", () => {
    const params = { topK: 4, topP: 0.9, temperature: 1.2 };
    const first = applySelectionStrategy(RAW, "temperature", params, "seed-c");
    const second = applySelectionStrategy(RAW, "temperature", params, "seed-c");
    expect(first.selectedToken).toBe(second.selectedToken);
    expect(first.candidates).toHaveLength(4);
  });

  it("avoids immediate repeats across token marker variants when requested", () => {
    const markerCandidates = [
      { token: "ĠAn", probability: 0.45 },
      { token: "▁An", probability: 0.35 },
      { token: " model", probability: 0.2 },
    ];
    const result = applySelectionStrategy(
      markerCandidates,
      "temperature",
      { topK: 3, topP: 0.9, temperature: 1 },
      "seed-marker",
      { previousToken: " An", avoidImmediateRepeat: true },
    );
    expect(result.selectedToken).toBe(" model");
  });

  it("avoids two-token back-and-forth loops when requested", () => {
    const result = applySelectionStrategy(
      [
        { token: " A", probability: 0.8 },
        { token: " B", probability: 0.15 },
        { token: " C", probability: 0.05 },
      ],
      "top_k",
      { topK: 3, topP: 0.9, temperature: 1 },
      "seed-loop",
      {
        previousToken: " A",
        avoidImmediateRepeat: true,
        recentTokens: [" A", " B", " A"],
        avoidTwoTokenLoop: true,
      },
    );
    expect(result.selectedToken).toBe(" C");
  });

  it("avoids reusing tokens from recent window when requested", () => {
    const result = applySelectionStrategy(
      [
        { token: " An", probability: 0.7 },
        { token: " LL", probability: 0.2 },
        { token: " model", probability: 0.1 },
      ],
      "temperature",
      { topK: 3, topP: 0.9, temperature: 1 },
      "seed-recent",
      {
        previousToken: " An",
        avoidImmediateRepeat: true,
        recentTokens: [" An", " LL", " An"],
        avoidTwoTokenLoop: true,
        avoidRecentTokenReuse: true,
        recentTokenWindow: 4,
      },
    );
    expect(result.selectedToken).toBe(" model");
  });
});
