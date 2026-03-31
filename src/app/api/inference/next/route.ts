import { NextResponse } from "next/server";

import { getRun } from "@/lib/server/run-registry";
import { getOpenAiNextStep } from "@/lib/server/openai-next-step";
import type { VisualizationConfig } from "@/types/visualizer";

interface NextPayload {
  runId?: string;
  prefixTokens?: string[];
  config?: VisualizationConfig;
}

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const payload = (await request.json()) as NextPayload;

    if (!payload.runId || !Array.isArray(payload.prefixTokens)) {
      return NextResponse.json({ error: "Missing runId or prefixTokens." }, { status: 400 });
    }

    const context = getRun(payload.runId);
    const provider = context?.provider ?? payload.config?.provider;
    const config = payload.config ?? context?.config;

    if (!provider || !config) {
      return NextResponse.json(
        { error: "Missing provider/config context for next-step generation." },
        { status: 400 },
      );
    }

    if (provider === "hf-local") {
      return NextResponse.json(
        { error: "Local HuggingFace provider is planned for phase 2." },
        { status: 501 },
      );
    }

    if (provider !== "openai") {
      return NextResponse.json({ error: "Provider not supported by API route." }, { status: 400 });
    }

    const result = await getOpenAiNextStep(config, payload.prefixTokens);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate next step.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
