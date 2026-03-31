"use client";

import { Info, LocateFixed, Pause, Play, RotateCcw, StepForward } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useVisualizerStore } from "@/store/visualizer-store";
import type { StrategyType } from "@/types/visualizer";

function InfoButton({
  label,
  title,
}: {
  label: string;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-zinc-600 text-zinc-300 transition hover:border-cyan-400 hover:text-cyan-300"
      aria-label={label}
    >
      <Info className="h-3.5 w-3.5" />
    </button>
  );
}

export function ControlPanel() {
  const config = useVisualizerStore((state) => state.config);
  const runStatus = useVisualizerStore((state) => state.runStatus);
  const isStepping = useVisualizerStore((state) => state.isStepping);
  const autoPlay = useVisualizerStore((state) => state.autoPlay);
  const hintMessage = useVisualizerStore((state) => state.hintMessage);
  const errorMessage = useVisualizerStore((state) => state.errorMessage);
  const presets = useVisualizerStore((state) => state.presets);
  const updateConfig = useVisualizerStore((state) => state.updateConfig);
  const setStrategyParam = useVisualizerStore((state) => state.setStrategyParam);
  const setLayoutMode = useVisualizerStore((state) => state.setLayoutMode);
  const stepRun = useVisualizerStore((state) => state.stepRun);
  const startRun = useVisualizerStore((state) => state.startRun);
  const resetRun = useVisualizerStore((state) => state.resetRun);
  const toggleAutoPlay = useVisualizerStore((state) => state.toggleAutoPlay);
  const savePreset = useVisualizerStore((state) => state.savePreset);
  const applyPreset = useVisualizerStore((state) => state.applyPreset);
  const deletePreset = useVisualizerStore((state) => state.deletePreset);
  const setHintMessage = useVisualizerStore((state) => state.setHintMessage);
  const requestRecenterToStart = useVisualizerStore((state) => state.requestRecenterToStart);

  const [presetName, setPresetName] = useState("");
  const [openAiModels, setOpenAiModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsLoadError, setModelsLoadError] = useState<string | null>(null);
  const hasManualOpenAiApiKey = config.openAIApiKey.trim().length > 0;
  const disableConfigWhileRunning = runStatus === "running" && isStepping;

  const strategyLabel = useMemo(() => {
    if (config.strategy === "top_k") {
      return "Top-k beam";
    }
    if (config.strategy === "top_p") {
      return "Top-p nucleus";
    }
    return "Temperature sample";
  }, [config.strategy]);

  useEffect(() => {
    if (config.provider !== "openai") {
      return;
    }
    if (!hasManualOpenAiApiKey) {
      setOpenAiModels([]);
      setModelsLoadError(null);
      setIsLoadingModels(false);
      return;
    }

    let cancelled = false;
    const loadModels = async () => {
      setIsLoadingModels(true);
      setModelsLoadError(null);
      try {
        const response = await fetch("/api/inference/models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            openAIApiKey: config.openAIApiKey,
          }),
        });
        const payload = (await response.json()) as { models?: string[]; error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load model list.");
        }
        const models = payload.models ?? [];
        if (!cancelled) {
          setOpenAiModels(models);
          if (models.length === 0) {
            setModelsLoadError(
              "No compatible chat+logprobs models were found for this API key.",
            );
          }
        }
      } catch (error) {
        if (!cancelled) {
          setOpenAiModels([]);
          setModelsLoadError(
            error instanceof Error ? error.message : "Could not load compatible model list.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingModels(false);
        }
      }
    };

    void loadModels();
    return () => {
      cancelled = true;
    };
  }, [config.provider, config.openAIApiKey, hasManualOpenAiApiKey]);

  useEffect(() => {
    if (config.provider !== "openai") {
      return;
    }
    if (openAiModels.length === 0) {
      return;
    }
    if (!openAiModels.includes(config.model)) {
      updateConfig({ model: openAiModels[0] });
    }
  }, [config.provider, config.model, openAiModels, updateConfig]);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-zinc-100">Controls</h2>
        <span className="text-xs text-zinc-400">{strategyLabel}</span>
      </div>

      <div className="mt-4 space-y-3">
        <label className="flex flex-col gap-1 text-xs text-zinc-300">
          <span className="inline-flex items-center gap-1">
            Prompt
            <InfoButton
              label="Prompt help"
              title="Write what you want the model to continue from. Example: Explain how an LLM works."
            />
          </span>
          <textarea
            value={config.prompt}
            disabled={runStatus === "running"}
            onChange={(event) => updateConfig({ prompt: event.target.value })}
            className="min-h-20 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ring-cyan-400 focus:ring"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-zinc-300">
            <span className="inline-flex items-center gap-1">
              Provider
              <InfoButton
                label="Provider help"
                title="Choose where next-token predictions come from: deterministic mock, OpenAI API, or future local HF."
              />
            </span>
            <select
              value={config.provider}
              disabled={runStatus === "running"}
              onChange={(event) =>
                updateConfig({ provider: event.target.value as typeof config.provider })
              }
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm"
            >
              <option value="mock">Mock (deterministic)</option>
              <option value="openai">OpenAI API</option>
              <option value="hf-local">HF Local (phase 2)</option>
            </select>
          </label>

          {config.provider === "openai" ? (
            <label className="flex flex-col gap-1 text-xs text-zinc-300">
              <span className="inline-flex items-center gap-1">
                Model
                <InfoButton
                  label="Model help"
                  title="This dropdown lists only OpenAI models that passed compatibility checks for chat + logprobs."
                />
              </span>
              <select
                value={config.model}
                disabled={
                  runStatus === "running" ||
                  isLoadingModels ||
                  !hasManualOpenAiApiKey ||
                  openAiModels.length === 0
                }
                onChange={(event) => updateConfig({ model: event.target.value })}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm"
              >
                {!hasManualOpenAiApiKey ? (
                  <option value={config.model}>Enter API key to load models</option>
                ) : openAiModels.length === 0 ? (
                  <option value={config.model}>No compatible models found</option>
                ) : null}
                {openAiModels.map((modelId) => (
                  <option key={modelId} value={modelId}>
                    {modelId}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="flex flex-col gap-1 text-xs text-zinc-300">
              <span className="inline-flex items-center gap-1">
                Model
                <InfoButton
                  label="Model help"
                  title="Type the model id used by the selected provider."
                />
              </span>
              <input
                value={config.model}
                disabled={runStatus === "running"}
                onChange={(event) => updateConfig({ model: event.target.value })}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                placeholder="gpt-4o-mini"
              />
            </label>
          )}
        </div>

        {config.provider === "openai" ? (
          <div className="space-y-1">
            <label className="flex flex-col gap-1 text-xs text-zinc-300">
              <span className="inline-flex items-center gap-1">
                OpenAI API Key (optional if `OPENAI_API_KEY` env is set)
                <InfoButton
                  label="OpenAI API key help"
                  title="Used to call OpenAI and to load your compatible model list. Left blank if your local env already provides OPENAI_API_KEY."
                />
              </span>
              <input
                type="password"
                value={config.openAIApiKey}
                disabled={runStatus === "running"}
                onChange={(event) => updateConfig({ openAIApiKey: event.target.value })}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                placeholder="sk-..."
              />
            </label>
            <p className="text-[11px] text-zinc-500">
              Enter an OpenAI API key to load your compatible model list. Selection is sent
              directly as the request `model` value.
            </p>
            {isLoadingModels ? (
              <p className="text-[11px] text-zinc-500">Loading models...</p>
            ) : null}
            {modelsLoadError && hasManualOpenAiApiKey ? (
              <p className="text-[11px] text-amber-300">{modelsLoadError}</p>
            ) : null}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-zinc-300">
            <span className="inline-flex items-center gap-1">
              Strategy
              <InfoButton
                label="Strategy help"
                title="How the app picks the next word."
              />
            </span>
            <select
              value={config.strategy}
              disabled={disableConfigWhileRunning}
              onChange={(event) => updateConfig({ strategy: event.target.value as StrategyType })}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm"
            >
              <option value="top_k">Top-k beam</option>
              <option value="top_p">Top-p nucleus</option>
              <option value="temperature">Temperature sample</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-zinc-300">
            <span className="inline-flex items-center gap-1">
              Topology
              <InfoButton
                label="Topology help"
                title="How the tree is drawn on screen."
              />
            </span>
            <select
              value={config.layoutMode}
              onChange={(event) => setLayoutMode(event.target.value as typeof config.layoutMode)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm"
            >
              <option value="layered_lr">Layered LR</option>
              <option value="top_down">Top-down</option>
              <option value="radial">Radial</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-xs text-zinc-300">
            <span className="inline-flex items-center gap-1">
              Top-k
              <InfoButton
                label="Top-k help"
                title="Show this many highest-probability choices at each step."
              />
            </span>
            <input
              type="number"
              min={1}
              max={20}
              value={config.strategyParams.topK}
              onChange={(event) => setStrategyParam({ topK: Number(event.target.value) })}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-300">
            <span className="inline-flex items-center gap-1">
              Top-p
              <InfoButton
                label="Top-p help"
                title="Include choices until their combined probability reaches this value."
              />
            </span>
            <input
              type="number"
              min={0.1}
              max={1}
              step={0.01}
              value={config.strategyParams.topP}
              onChange={(event) => setStrategyParam({ topP: Number(event.target.value) })}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-300">
            <span className="inline-flex items-center gap-1">
              Temperature
              <InfoButton
                label="Temperature help"
                title="Lower values make safer, repeated choices. Higher values increase variation."
              />
            </span>
            <input
              type="number"
              min={0.1}
              max={2}
              step={0.05}
              value={config.strategyParams.temperature}
              onChange={(event) => setStrategyParam({ temperature: Number(event.target.value) })}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-zinc-300">
            <span className="inline-flex items-center gap-1">
              Max depth
              <InfoButton
                label="Max depth help"
                title="Maximum number of generation steps before the run stops."
              />
            </span>
            <input
              type="number"
              min={1}
              max={80}
              value={config.maxDepth}
              onChange={(event) => updateConfig({ maxDepth: Number(event.target.value) })}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-300">
            <span className="inline-flex items-center gap-1">
              Speed ({config.speed.toFixed(1)}x)
              <InfoButton
                label="Speed help"
                title="Controls autoplay pace only. It does not change model probabilities."
              />
            </span>
            <input
              type="range"
              min={0.25}
              max={3}
              step={0.25}
              value={config.speed}
              onChange={(event) => updateConfig({ speed: Number(event.target.value) })}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs text-zinc-300">
          <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-2 py-2">
            <input
              type="checkbox"
              checked={config.accuracyMode}
              onChange={(event) => updateConfig({ accuracyMode: event.target.checked })}
            />
            Accuracy mode
            <InfoButton
              label="Accuracy mode help"
              title="Shows each token's raw probability and the percentage within visible options."
            />
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-2 py-2">
            <input
              type="checkbox"
              checked={config.autoFocus}
              onChange={(event) => updateConfig({ autoFocus: event.target.checked })}
            />
            Auto-focus
            <InfoButton
              label="Auto-focus help"
              title="Keeps the camera centered on the active generation step while autoplay runs."
            />
          </label>
        </div>

        <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2">
          <div className="flex gap-2">
            <input
              value={presetName}
              onChange={(event) => setPresetName(event.target.value)}
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
              placeholder="Preset name"
            />
            <button
              type="button"
              onClick={() => {
                savePreset(presetName);
                setPresetName("");
              }}
              className="rounded-md border border-cyan-600 px-2 py-1 text-xs text-cyan-300 transition hover:bg-cyan-500/10"
            >
              Save
            </button>
          </div>
          <div className="max-h-28 space-y-1 overflow-auto pr-1">
            {presets.length === 0 ? (
              <p className="text-xs text-zinc-500">No presets saved yet.</p>
            ) : null}
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center justify-between rounded border border-zinc-800 px-2 py-1 text-xs"
              >
                <button
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className="text-left text-zinc-300 transition hover:text-cyan-300"
                >
                  {preset.name}
                </button>
                <button
                  type="button"
                  onClick={() => deletePreset(preset.id)}
                  className="text-zinc-500 transition hover:text-rose-300"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void startRun()}
            disabled={runStatus === "running" || isStepping}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm transition hover:border-cyan-500 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Play className="h-4 w-4" />
            Start
          </button>
          <button
            type="button"
            onClick={() => void stepRun()}
            disabled={isStepping || runStatus === "error"}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm transition hover:border-cyan-500 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <StepForward className="h-4 w-4" />
            Step
          </button>
          <button
            type="button"
            onClick={() => {
              if (runStatus === "idle") {
                void startRun().then(() => {
                  toggleAutoPlay();
                });
                return;
              }
              toggleAutoPlay();
            }}
            disabled={runStatus === "error"}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm transition hover:border-cyan-500 hover:text-cyan-200"
          >
            {autoPlay ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {autoPlay ? "Pause" : "Autoplay"}
          </button>
          <button
            type="button"
            onClick={resetRun}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm transition hover:border-cyan-500 hover:text-cyan-200"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={requestRecenterToStart}
            className="col-span-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm transition hover:border-cyan-500 hover:text-cyan-200"
          >
            <LocateFixed className="h-4 w-4" />
            Recenter to Step 0
          </button>
        </div>
      </div>

      {hintMessage ? (
        <p className="mt-3 rounded-md border border-cyan-900/60 bg-cyan-950/30 px-2 py-1 text-xs text-cyan-200">
          {hintMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="mt-2 rounded-md border border-rose-900/60 bg-rose-950/20 px-2 py-1 text-xs text-rose-200">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setHintMessage(null)}
        className="mt-2 text-[11px] text-zinc-500 transition hover:text-zinc-300"
      >
        Clear messages
      </button>
    </section>
  );
}
