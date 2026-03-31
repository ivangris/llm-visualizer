import { NextResponse } from "next/server";

import { createRun } from "@/lib/server/run-registry";
import type { ProviderType, VisualizationConfig } from "@/types/visualizer";

interface StartPayload {
  provider?: ProviderType;
  config?: VisualizationConfig;
}

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const payload = (await request.json()) as StartPayload;
    if (!payload.provider || !payload.config) {
      return NextResponse.json({ error: "Missing provider or config." }, { status: 400 });
    }

    if (payload.provider === "hf-local") {
      return NextResponse.json(
        { error: "Local HuggingFace provider is planned for phase 2." },
        { status: 501 },
      );
    }

    const runId = createRun(payload.provider, payload.config);
    return NextResponse.json({ runId });
  } catch {
    return NextResponse.json({ error: "Failed to start run." }, { status: 500 });
  }
}
