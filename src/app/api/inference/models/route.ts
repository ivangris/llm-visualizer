import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

export const runtime = "nodejs";

interface ModelsPayload {
  openAIApiKey?: string;
}

interface OpenAIModelsResponse {
  data?: Array<{
    id: string;
  }>;
  error?: {
    message?: string;
  };
}

interface OpenAIChatCompatibilityResponse {
  choices?: Array<{
    logprobs?: {
      content?: Array<{
        top_logprobs?: Array<{ token: string; logprob: number }>;
      }>;
    };
  }>;
}

const CACHE_TTL_MS = 1000 * 60 * 10;
const compatibilityCache = new Map<string, { expiresAt: number; models: string[] }>();

function includeModel(modelId: string): boolean {
  const lower = modelId.toLowerCase();
  if (!lower.startsWith("gpt-") && !lower.startsWith("o")) {
    return false;
  }
  if (lower.includes("embedding")) {
    return false;
  }
  if (lower.includes("moderation")) {
    return false;
  }
  if (lower.includes("audio")) {
    return false;
  }
  if (lower.includes("image")) {
    return false;
  }
  if (lower.includes("tts")) {
    return false;
  }
  if (lower.includes("whisper")) {
    return false;
  }
  return true;
}

function cacheKeyForApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

async function checkModelCompatibility(modelId: string, apiKey: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: "user", content: "Test token generation." }],
        max_completion_tokens: 1,
        temperature: 0,
        logprobs: true,
        top_logprobs: 1,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as OpenAIChatCompatibilityResponse;
    const topLogProbs = payload.choices?.[0]?.logprobs?.content?.[0]?.top_logprobs;
    return Array.isArray(topLogProbs);
  } catch {
    return false;
  }
}

async function filterCompatibleModels(modelIds: string[], apiKey: string): Promise<string[]> {
  const compatible: string[] = [];
  const maxConcurrent = 4;
  const queue = [...modelIds];

  const workers = Array.from({ length: maxConcurrent }, async () => {
    while (queue.length > 0) {
      const modelId = queue.shift();
      if (!modelId) {
        return;
      }
      const passed = await checkModelCompatibility(modelId, apiKey);
      if (passed) {
        compatible.push(modelId);
      }
    }
  });

  await Promise.all(workers);
  return compatible.sort((a, b) => a.localeCompare(b));
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const payload = (await request.json()) as ModelsPayload;
    const apiKey = payload.openAIApiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Missing OpenAI API key. Add it in the UI at runtime or set OPENAI_API_KEY. Runtime-entered keys are not persisted.",
        },
        { status: 400 },
      );
    }

    const cacheKey = cacheKeyForApiKey(apiKey);
    const cached = compatibilityCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ models: cached.models });
    }

    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    });

    const modelsPayload = (await response.json()) as OpenAIModelsResponse;
    if (!response.ok) {
      return NextResponse.json(
        { error: modelsPayload.error?.message ?? "Failed to fetch models from OpenAI." },
        { status: response.status },
      );
    }

    const candidateModels = (modelsPayload.data ?? [])
      .map((entry) => entry.id)
      .filter(includeModel);
    const models = await filterCompatibleModels(candidateModels, apiKey);

    compatibilityCache.set(cacheKey, {
      models,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return NextResponse.json({ models });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error fetching models.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
