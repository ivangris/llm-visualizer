import type {
  NextStepResponse,
  ProviderAdapter,
  ProviderType,
  StartRunResponse,
  VisualizationConfig,
} from "@/types/visualizer";

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = "Request failed";
    try {
      const payload = (await response.json()) as { error?: string };
      message = payload.error ?? message;
    } catch {
      // Ignore JSON parsing failure and keep default message.
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export function createApiProvider(provider: ProviderType): ProviderAdapter {
  return {
    async startRun(config: VisualizationConfig): Promise<StartRunResponse> {
      const response = await fetch("/api/inference/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          config,
        }),
      });
      return parseResponse<StartRunResponse>(response);
    },

    async nextStep(
      runId: string,
      prefixTokens: string[],
      config: VisualizationConfig,
    ): Promise<NextStepResponse> {
      const response = await fetch("/api/inference/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId,
          prefixTokens,
          config,
        }),
      });
      return parseResponse<NextStepResponse>(response);
    },
  };
}

