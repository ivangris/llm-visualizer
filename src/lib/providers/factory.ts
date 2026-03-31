import { createApiProvider } from "@/lib/providers/api-provider";
import { mockProvider } from "@/lib/providers/mock-provider";
import type { ProviderAdapter, ProviderType } from "@/types/visualizer";

export function getProviderAdapter(provider: ProviderType): ProviderAdapter {
  if (provider === "mock") {
    return mockProvider;
  }
  return createApiProvider(provider);
}

