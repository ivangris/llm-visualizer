import { DEFAULT_CONFIG } from "@/lib/defaults";
import { createPreset, loadPresetsFromStorage, persistPresets } from "@/lib/presets";

describe("preset persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("saves and reloads presets including layout mode", () => {
    const preset = createPreset("demo", {
      ...DEFAULT_CONFIG,
      layoutMode: "radial",
    });
    persistPresets([preset]);
    const loaded = loadPresetsFromStorage();

    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe("demo");
    expect(loaded[0].config.layoutMode).toBe("radial");
  });
});

