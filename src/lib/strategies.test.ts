import { applySelectionStrategy } from "@/lib/strategies";

const RAW = [
  { token: " A", probability: 0.45 },
  { token: " B", probability: 0.25 },
  { token: " C", probability: 0.15 },
  { token: " D", probability: 0.1 },
  { token: " E", probability: 0.05 },
];

describe("applySelectionStrategy", () => {
  it("keeps top-k candidates and selects highest probability token", () => {
    const result = applySelectionStrategy(
      RAW,
      "top_k",
      { topK: 3, topP: 0.9, temperature: 1 },
      "seed-a",
    );
    expect(result.candidates).toHaveLength(3);
    expect(result.selectedToken).toBe(" A");
    expect(result.candidates[0].rank).toBe(1);
  });

  it("builds nucleus candidates and selects highest probability token", () => {
    const result = applySelectionStrategy(
      RAW,
      "top_p",
      { topK: 5, topP: 0.7, temperature: 1 },
      "seed-b",
    );
    expect(result.candidates.length).toBeGreaterThanOrEqual(2);
    expect(result.selectedToken).toBe(" A");
  });

  it("samples deterministically in temperature mode with same seed", () => {
    const params = { topK: 4, topP: 0.9, temperature: 1.2 };
    const first = applySelectionStrategy(RAW, "temperature", params, "seed-c");
    const second = applySelectionStrategy(RAW, "temperature", params, "seed-c");
    expect(first.selectedToken).toBe(second.selectedToken);
    expect(first.candidates).toHaveLength(4);
  });
});

