import { PRESET_STORAGE_KEY } from "@/lib/defaults";
import type { VisualizationConfig, VisualizationPreset } from "@/types/visualizer";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadPresetsFromStorage(): VisualizationPreset[] {
  if (!canUseStorage()) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(PRESET_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as VisualizationPreset[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistPresets(presets: VisualizationPreset[]): void {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
}

export function createPreset(name: string, config: VisualizationConfig): VisualizationPreset {
  return {
    id: crypto.randomUUID(),
    name,
    config,
    createdAt: new Date().toISOString(),
  };
}

