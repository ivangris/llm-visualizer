import type { ProviderType, VisualizationConfig } from "@/types/visualizer";

interface RunContext {
  runId: string;
  provider: ProviderType;
  config: VisualizationConfig;
  createdAt: number;
}

const runRegistry = new Map<string, RunContext>();
const MAX_AGE_MS = 1000 * 60 * 60;

function pruneExpiredRuns(): void {
  const now = Date.now();
  for (const [runId, context] of runRegistry.entries()) {
    if (now - context.createdAt > MAX_AGE_MS) {
      runRegistry.delete(runId);
    }
  }
}

export function createRun(provider: ProviderType, config: VisualizationConfig): string {
  pruneExpiredRuns();
  const runId = crypto.randomUUID();
  runRegistry.set(runId, {
    runId,
    provider,
    config,
    createdAt: Date.now(),
  });
  return runId;
}

export function getRun(runId: string): RunContext | undefined {
  pruneExpiredRuns();
  return runRegistry.get(runId);
}

