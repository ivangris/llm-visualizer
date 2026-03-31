import { applySelectionStrategy, type RawCandidate } from "@/lib/strategies";
import type { NextStepResponse, VisualizationConfig } from "@/types/visualizer";

interface OpenAITokenLogprob {
  token: string;
  logprob: number;
}

interface OpenAIChatChoice {
  logprobs?: {
    content?: Array<{
      token: string;
      logprob: number;
      top_logprobs?: OpenAITokenLogprob[];
    }>;
  };
}

interface OpenAIChatResponse {
  choices?: OpenAIChatChoice[];
  error?: {
    message?: string;
  };
}

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function buildMessages(prompt: string, prefixTokens: string[]): ChatMessage[] {
  const continuation = prefixTokens.join("");
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You are generating an answer one token at a time for visualization. Continue from the existing assistant prefix exactly. Do not restart the answer or repeat from the beginning.",
    },
    {
      role: "user",
      content: prompt,
    },
  ];

  if (continuation.length > 0) {
    messages.push({
      role: "assistant",
      content: continuation,
    });
  }

  return messages;
}

function logprobToProbability(logprob: number): number {
  return Math.exp(logprob);
}

function extractRawCandidates(payload: OpenAIChatResponse): RawCandidate[] {
  const firstChoice = payload.choices?.[0];
  const firstLogprobEntry = firstChoice?.logprobs?.content?.[0];
  if (!firstLogprobEntry) {
    return [];
  }

  const top = firstLogprobEntry.top_logprobs ?? [];
  const candidates = top.map((entry) => ({
    token: entry.token,
    probability: logprobToProbability(entry.logprob),
    logprob: entry.logprob,
  }));

  if (!candidates.some((candidate) => candidate.token === firstLogprobEntry.token)) {
    candidates.push({
      token: firstLogprobEntry.token,
      probability: logprobToProbability(firstLogprobEntry.logprob),
      logprob: firstLogprobEntry.logprob,
    });
  }
  return candidates;
}

export async function getOpenAiNextStep(
  config: VisualizationConfig,
  prefixTokens: string[],
): Promise<NextStepResponse> {
  const apiKey = config.openAIApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OpenAI API key. Add it in the UI or OPENAI_API_KEY.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: buildMessages(config.prompt, prefixTokens),
      max_completion_tokens: 1,
      temperature: 0,
      logprobs: true,
      top_logprobs: 20,
    }),
  });

  const payload = (await response.json()) as OpenAIChatResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "OpenAI request failed.");
  }

  const rawCandidates = extractRawCandidates(payload);
  if (rawCandidates.length === 0) {
    throw new Error(
      "No token logprobs returned. Try a model that supports logprobs for chat completions.",
    );
  }

  const seedInput = `openai-${prefixTokens.length}-${prefixTokens.join("|")}`;
  const result = applySelectionStrategy(
    rawCandidates,
    config.strategy,
    config.strategyParams,
    seedInput,
    {
      previousToken:
        prefixTokens.length > 0 ? prefixTokens[prefixTokens.length - 1] : undefined,
      avoidImmediateRepeat: config.strategy === "top_k" || config.strategy === "top_p",
    },
  );

  return {
    candidates: result.candidates,
    selectedToken: result.selectedToken,
    done: result.selectedToken.length === 0 || prefixTokens.length + 1 >= config.maxDepth,
  };
}
