import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { canOpen } from "../src/library/catalog";
import { canonicalDestination, libraryBack, mayFinishPage } from "../src/library/navigation";
import { search } from "../src/library/search";
import { DISCOVERY_LABS, discoveryLabById, discoveryLabSearchIndex, isDiscoveryLabId } from "../src/library/labs/registry";
import {
  COLOR_LIGHT_CHALLENGES,
  MAX_PAINT_DROPS,
  computeLightMix,
  computePaintMix,
  createColorLightState,
  reduceColorLight,
} from "../src/library/labs/colorLightEngine";
import {
  ISLAND_DRUMS,
  PLUCK_STRINGS,
  SOUND_CHALLENGES,
  XYLOPHONE_BARS,
  activeTracksOnBeat,
  buildWavePath,
  createSoundRhythmState,
  effectiveFrequency,
  reduceSoundRhythm,
  waveMetrics,
} from "../src/library/labs/soundRhythmEngine";
import {
  VOLCANO_CHALLENGES,
  createVolcanoIslandState,
  reduceVolcanoIsland,
} from "../src/library/labs/volcanoIslandEngine";
import {
  PHYSICS_CHALLENGES,
  computeRampRun,
  computeSeesawPhysics,
  createRampBalanceState,
  reduceRampBalance,
} from "../src/library/labs/rampBalanceEngine";
import {
  PLANT_CHALLENGES,
  createPlantGrowthState,
  reducePlantGrowth,
  stageTitle,
} from "../src/library/labs/plantGrowthEngine";
import {
  BREATH_PHASES,
  HEARTBEAT_CHALLENGES,
  createHeartbeatBreathState,
  effectiveBpm,
  reduceHeartbeatBreath,
} from "../src/library/labs/heartbeatBreathEngine";
import {
  createLabSoundPlayer,
  resolveNativeTonePlan,
  type NativeSampleKey,
  type NativeTonePlayer,
} from "../src/library/labs/soundSynth";
import { javascriptStrings } from "../scripts/words/artifact-views.mjs";
import { wordTokens } from "../scripts/words/density.mjs";

describe("Discovery Labs registry, search, permissions, and navigation", () => {
  it("registers all 6 unique Discovery Labs with valid canonical destinations and collection permissions", () => {
    expect(DISCOVERY_LABS).toHaveLength(6);
    expect(new Set(DISCOVERY_LABS.map((lab) => lab.id)).size).toBe(6);

    for (const lab of DISCOVERY_LABS) {
      expect(isDiscoveryLabId(lab.id)).toBe(true);
      expect(discoveryLabById(lab.id)).toEqual(lab);
      expect(discoveryLabById(lab.destinationId)).toEqual(lab);
      expect(canonicalDestination("discovery-lab", lab.id)).toBe(`dlab-${lab.id}`);
      expect(canOpen(lab.destinationId, [lab.category])).toBe(true);
      expect(canOpen(lab.destinationId, [])).toBe(false);
    }

    expect(mayFinishPage("discovery-lab", true)).toBe(true);
    expect(mayFinishPage("discovery-lab", false)).toBe(false);
    expect(libraryBack("discovery-lab", "color-light-lab")).toBe("history");
    expect(libraryBack("wonder", "")).toBe("island");
  });

  it("matches every Discovery Lab through offline fuzzy search and respects allowed set", () => {
    const allIds = new Set(DISCOVERY_LABS.map((lab) => lab.destinationId));
    expect(search(discoveryLabSearchIndex, "rainbow", allIds).map((e) => e.id)).toContain("dlab-color-light-lab");
    expect(search(discoveryLabSearchIndex, "xylophone", allIds).map((e) => e.id)).toContain("dlab-sound-rhythm-lab");
    expect(search(discoveryLabSearchIndex, "volcano", allIds).map((e) => e.id)).toContain("dlab-volcano-island-lab");
    expect(search(discoveryLabSearchIndex, "seesaw", allIds).map((e) => e.id)).toContain("dlab-ramp-balance-lab");
    expect(search(discoveryLabSearchIndex, "hibiscus", allIds).map((e) => e.id)).toContain("dlab-plant-growth-lab");
    expect(search(discoveryLabSearchIndex, "heartbeat", allIds).map((e) => e.id)).toContain("dlab-heartbeat-breath-lab");
    expect(search(discoveryLabSearchIndex, "volcano", new Set())).toEqual([]);
  });

  it("contains zero setTimeout or setInterval calls across src/library/labs/", () => {
    const dir = "src/library/labs";
    const files = readdirSync(dir).filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));
    expect(files.length).toBeGreaterThanOrEqual(10);
    for (const file of files) {
      const source = readFileSync(join(dir, file), "utf8");
      const stripped = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
      expect(stripped, file).not.toMatch(/\b(?:setTimeout|setInterval)\b/);
    }
  });
});

describe("1. Color & Light Mixing Studio engine", () => {
  it("mixes subtractive RYB paints accurately (Orange, Green, Purple, Pink, Teal, Brown, Sky Blue, Island Coral)", () => {
    expect(computePaintMix({ red: 0, yellow: 0, blue: 0, white: 0, black: 0 }).colorName).toBe("Empty Mixing Bowl");
    expect(computePaintMix({ red: 1, yellow: 1, blue: 0, white: 0, black: 0 }).colorName).toBe("Sunset Orange");
    expect(computePaintMix({ red: 0, yellow: 1, blue: 1, white: 0, black: 0 }).colorName).toBe("Palm Green");
    expect(computePaintMix({ red: 1, yellow: 0, blue: 1, white: 0, black: 0 }).colorName).toBe("Hibiscus Purple");
    expect(computePaintMix({ red: 1, yellow: 0, blue: 0, white: 1, black: 0 }).colorName).toBe("Blossom Pink");
    expect(computePaintMix({ red: 0, yellow: 1, blue: 2, white: 0, black: 0 }).colorName).toBe("Lagoon Teal");
    expect(computePaintMix({ red: 1, yellow: 1, blue: 1, white: 0, black: 0 }).colorName).toBe("Coconut Brown");
    expect(computePaintMix({ red: 0, yellow: 0, blue: 1, white: 1, black: 0 }).colorName).toBe("Sky Blue");
    expect(computePaintMix({ red: 1, yellow: 1, blue: 0, white: 1, black: 0 }).colorName).toBe("Island Coral");
  });

  it("caps paint drops at MAX_PAINT_DROPS and combines additive RGB light + prism spectrum", () => {
    let state = createColorLightState();
    for (let i = 0; i < MAX_PAINT_DROPS + 4; i++) {
      state = reduceColorLight(state, { type: "add-drop", pigment: "red" });
    }
    expect(computePaintMix(state.drops).totalDrops).toBe(MAX_PAINT_DROPS);

    expect(computeLightMix({ red: true, green: true, blue: false }, 30, false).colorName).toBe("Glowing Yellow Light");
    expect(computeLightMix({ red: false, green: true, blue: true }, 30, false).colorName).toBe("Lagoon Cyan Light");
    expect(computeLightMix({ red: true, green: false, blue: true }, 30, false).colorName).toBe("Bright Magenta Light");
    expect(computeLightMix({ red: true, green: true, blue: true }, 30, false).colorName).toBe("Pure White Light!");

    const straightSun = computeLightMix({ red: false, green: false, blue: false }, 0, true);
    expect(straightSun.rainbowVisible).toBe(false);
    const bentSun = computeLightMix({ red: false, green: false, blue: false }, 45, true);
    expect(bentSun.rainbowVisible).toBe(true);
    expect(bentSun.rainbowSpread).toBeGreaterThan(0.5);

    // Challenge check: Palm Green
    let greenState = createColorLightState();
    greenState = reduceColorLight(greenState, { type: "add-drop", pigment: "yellow" });
    greenState = reduceColorLight(greenState, { type: "add-drop", pigment: "blue" });
    expect(COLOR_LIGHT_CHALLENGES[0].check(greenState)).toBe(true);
  });
});

describe("2. Sound & Island Rhythm Waves engine", () => {
  it("computes tighter wave cycles for higher pitch and taller amplitude for louder levels", () => {
    const low = waveMetrics(XYLOPHONE_BARS[0].frequencyHz, "soft");
    const high = waveMetrics(XYLOPHONE_BARS[5].frequencyHz, "loud");
    expect(high.cycles).toBeGreaterThan(low.cycles);
    expect(high.amplitude).toBeGreaterThan(low.amplitude);

    const path = buildWavePath(440, "loud", 0);
    expect(path.startsWith("M0.0")).toBe(true);
    expect(path.split("L").length).toBeGreaterThan(30);
  });

  it("adjusts string frequency with tension, steps 4-beat rhythm, and degrades sound synth safely", () => {
    const str = PLUCK_STRINGS[0];
    expect(effectiveFrequency(str, "loose")).toBeLessThan(effectiveFrequency(str, "normal"));
    expect(effectiveFrequency(str, "tight")).toBeGreaterThan(effectiveFrequency(str, "normal"));

    let state = createSoundRhythmState();
    state = reduceSoundRhythm(state, { type: "play-pad", pad: ISLAND_DRUMS[0] });
    state = reduceSoundRhythm(state, { type: "play-pad", pad: XYLOPHONE_BARS[5] });
    expect(SOUND_CHALLENGES[0].check(state)).toBe(true);

    expect(activeTracksOnBeat(state.pattern, 0).map((t) => t.id)).toEqual(["drum", "chime"]);
    state = reduceSoundRhythm(state, { type: "step-beat" });
    expect(state.currentBeat).toBe(1);

    const synth = createLabSoundPlayer();
    expect(() => synth.playTone(440, "xylophone", 0.7)).not.toThrow();
    expect(() => synth.dispose()).not.toThrow();
  });
});

describe("3. Volcano & Island Builder engine", () => {
  it("requires heat & pressure to erupt and guides formation through coral reef to Guam palms", () => {
    let state = createVolcanoIslandState();
    state = reduceVolcanoIsland(state, { type: "set-heat", value: 1 });
    state = reduceVolcanoIsland(state, { type: "set-pressure", value: 1 });
    state = reduceVolcanoIsland(state, { type: "erupt" });
    expect(state.stage).toBe(0);
    expect(state.feedback).toContain("Pump Magma Heat");

    state = reduceVolcanoIsland(state, { type: "set-heat", value: 4 });
    state = reduceVolcanoIsland(state, { type: "set-pressure", value: 4 });
    state = reduceVolcanoIsland(state, { type: "erupt" });
    expect(state.stage).toBe(1);
    state = reduceVolcanoIsland(state, { type: "erupt" });
    expect(state.stage).toBe(2);
    expect(VOLCANO_CHALLENGES[0].check(state)).toBe(true);

    state = reduceVolcanoIsland(state, { type: "cool-lava" });
    expect(state.stage).toBe(3);

    // Cold water blocks coral reef
    state = reduceVolcanoIsland(state, { type: "set-reef-warmth", value: 1 });
    state = reduceVolcanoIsland(state, { type: "grow-reef" });
    expect(state.stage).toBe(3);

    state = reduceVolcanoIsland(state, { type: "set-reef-warmth", value: 4 });
    state = reduceVolcanoIsland(state, { type: "grow-reef" });
    expect(state.stage).toBe(4);
    expect(VOLCANO_CHALLENGES[1].check(state)).toBe(true);

    state = reduceVolcanoIsland(state, { type: "sprout-island" });
    expect(state.stage).toBe(5);
    expect(VOLCANO_CHALLENGES[2].check(state)).toBe(true);
  });
});

describe("4. Ramp & Balance Physics Lab engine", () => {
  it("calculates real torque balance (weight × distance) and detects Perfect Balance", () => {
    let state = createRampBalanceState();
    state = reduceRampBalance(state, { type: "clear-seesaw" });
    // Latte stone (4) at left notch 1 => torque 4
    state = reduceRampBalance(state, { type: "select-object", objectId: "latte" });
    state = reduceRampBalance(state, { type: "toggle-slot", side: "left", distance: 1 });
    // Coconut (1) at right notch 4 => torque 4
    state = reduceRampBalance(state, { type: "select-object", objectId: "coconut" });
    state = reduceRampBalance(state, { type: "toggle-slot", side: "right", distance: 4 });

    const physics = computeSeesawPhysics(state.slots);
    expect(physics.leftTorque).toBe(4);
    expect(physics.rightTorque).toBe(4);
    expect(physics.isBalanced).toBe(true);
    expect(physics.tiltDegrees).toBe(0);
    expect(PHYSICS_CHALLENGES[0].check(state)).toBe(true);
    expect(PHYSICS_CHALLENGES[1].check(state)).toBe(true);
  });

  it("computes farthest roll on Slippery Ice and shortest on Beach Sand, increasing with ramp height", () => {
    const ice = computeRampRun("medium", "ice", "car");
    const wood = computeRampRun("medium", "wood", "car");
    const sand = computeRampRun("medium", "sand", "car");
    const highIce = computeRampRun("high", "ice", "car");

    expect(ice.distanceMeters).toBeGreaterThan(wood.distanceMeters);
    expect(wood.distanceMeters).toBeGreaterThan(sand.distanceMeters);
    expect(highIce.distanceMeters).toBeGreaterThan(ice.distanceMeters);
  });
});

describe("5. Plant & Seed Growth Lab engine", () => {
  it("grows day-by-day through all 5 stages and detects thirsty/shady recovery", () => {
    let state = createPlantGrowthState("hibiscus");
    // Thirsty day
    state = reducePlantGrowth(state, { type: "set-rainwater", value: 1 });
    state = reducePlantGrowth(state, { type: "next-day" });
    expect(state.mood).toBe("thirsty");
    expect(state.wasEverThirsty).toBe(true);

    // Rescue with rain and sunlight
    state = reducePlantGrowth(state, { type: "set-rainwater", value: 4 });
    state = reducePlantGrowth(state, { type: "set-sunlight", value: 4 });
    for (let d = 0; d < 5; d++) {
      state = reducePlantGrowth(state, { type: "next-day" });
    }
    expect(state.recoveredFromThirst).toBe(true);
    expect(state.stage).toBe(4);
    expect(stageTitle(state.stage, state.plantId)).toContain("Bright Blooms");
    expect(PLANT_CHALLENGES[1].check(state)).toBe(true);
    expect(PLANT_CHALLENGES[2].check(state)).toBe(true);
  });
});

describe("6. Heartbeat & Calm Breath Lab engine", () => {
  it("raises BPM when running, lowers BPM when sleeping/calm breathing, and tracks breath cycles", () => {
    let state = createHeartbeatBreathState();
    state = reduceHeartbeatBreath(state, { type: "set-activity", activity: "sleeping" });
    const sleepBpm = effectiveBpm(state);
    state = reduceHeartbeatBreath(state, { type: "set-activity", activity: "running" });
    const runBpm = effectiveBpm(state);

    expect(runBpm).toBeGreaterThan(sleepBpm + 60);
    expect(HEARTBEAT_CHALLENGES[0].check(state)).toBe(true);

    state = reduceHeartbeatBreath(state, { type: "set-activity", activity: "calm-breath" });
    const calmBefore = effectiveBpm(state);
    // Step through 2 complete cycles (3 phases each)
    for (let i = 0; i < BREATH_PHASES.length * 2; i++) {
      state = reduceHeartbeatBreath(state, { type: "next-breath-phase" });
    }
    expect(state.calmBreathsCompleted).toBe(2);
    expect(effectiveBpm(state)).toBeLessThan(calmBefore);
    expect(HEARTBEAT_CHALLENGES[1].check(state)).toBe(true);
  });
});

describe("R1-03 & R1-08 regression checks: native pitch differentiation and word-safety guard shape", () => {
  it("maps every island drum, xylophone bar, and plucked string tension to a distinct native sample + playbackRate", () => {
    const drumPlans = ISLAND_DRUMS.map((pad) => {
      const plan = resolveNativeTonePlan(pad.frequencyHz, pad.voice);
      return `${plan.sampleKey}@${plan.playbackRate}`;
    });
    expect(new Set(drumPlans).size).toBe(ISLAND_DRUMS.length);

    const xyloPlans = XYLOPHONE_BARS.map((pad) => {
      const plan = resolveNativeTonePlan(pad.frequencyHz, pad.voice);
      return `${plan.sampleKey}@${plan.playbackRate}`;
    });
    expect(new Set(xyloPlans).size).toBe(XYLOPHONE_BARS.length);

    for (const str of PLUCK_STRINGS) {
      const loose = resolveNativeTonePlan(effectiveFrequency(str, "loose"), str.voice);
      const normal = resolveNativeTonePlan(effectiveFrequency(str, "normal"), str.voice);
      const tight = resolveNativeTonePlan(effectiveFrequency(str, "tight"), str.voice);
      const signatures = new Set([
        `${loose.sampleKey}@${loose.playbackRate}`,
        `${normal.sampleKey}@${normal.playbackRate}`,
        `${tight.sampleKey}@${tight.playbackRate}`,
      ]);
      expect(signatures.size, `Distinct pitches for ${str.id} across loose/normal/tight`).toBe(3);
    }
  });

  it("configures shouldCorrectPitch=false, setPlaybackRate, seekTo, play, stop, and dispose on native players", () => {
    const created = new Map<
      NativeSampleKey,
      {
        player: NativeTonePlayer;
        rates: number[];
        pitchFlags: boolean[];
        plays: number;
        pauses: number;
        removes: number;
      }
    >();

    const synth = createLabSoundPlayer((key) => {
      const record = {
        rates: [] as number[],
        pitchFlags: [] as boolean[],
        plays: 0,
        pauses: 0,
        removes: 0,
        player: {
          volume: 1,
          playbackRate: 1,
          shouldCorrectPitch: true,
          setPlaybackRate(rate: number) {
            record.rates.push(rate);
            record.player.playbackRate = rate;
          },
          seekTo: async () => {},
          play() {
            record.pitchFlags.push(Boolean(record.player.shouldCorrectPitch));
            record.plays += 1;
          },
          pause() {
            record.pauses += 1;
          },
          remove() {
            record.removes += 1;
          },
        } satisfies NativeTonePlayer,
      };
      created.set(key, record);
      return record.player;
    });

    const lowDrum = ISLAND_DRUMS[0];
    const highDrum = ISLAND_DRUMS[3];
    const looseStr = effectiveFrequency(PLUCK_STRINGS[0], "loose");
    const tightStr = effectiveFrequency(PLUCK_STRINGS[0], "tight");

    expect(synth.playTone(lowDrum.frequencyHz, "drum", 0.8)).toBe(true);
    expect(synth.playTone(highDrum.frequencyHz, "drum", 0.8)).toBe(true);
    expect(synth.playTone(looseStr, "string", 0.7)).toBe(true);
    expect(synth.playTone(tightStr, "string", 0.7)).toBe(true);

    const lowDrumPlan = resolveNativeTonePlan(lowDrum.frequencyHz, "drum");
    const highDrumPlan = resolveNativeTonePlan(highDrum.frequencyHz, "drum");
    expect(lowDrumPlan.sampleKey).not.toBe(highDrumPlan.sampleKey);
    expect(created.get(lowDrumPlan.sampleKey)?.plays).toBe(1);
    expect(created.get(highDrumPlan.sampleKey)?.plays).toBe(1);
    expect(created.get(lowDrumPlan.sampleKey)?.pitchFlags).toEqual([false]);

    const loosePlan = resolveNativeTonePlan(looseStr, "string");
    const tightPlan = resolveNativeTonePlan(tightStr, "string");
    expect(created.get(loosePlan.sampleKey)?.rates).toContain(loosePlan.playbackRate);
    expect(created.get(tightPlan.sampleKey)?.rates).toContain(tightPlan.playbackRate);

    synth.stop();
    expect(created.get(lowDrumPlan.sampleKey)?.pauses).toBe(1);

    synth.dispose();
    expect(created.get(lowDrumPlan.sampleKey)?.removes).toBe(1);
  });

  it("keeps Discovery Lab engines and registry free of plain English word-list arrays/maps that trip blocked-source-list", () => {
    const checkedFiles = [
      "src/library/labs/colorLightEngine.ts",
      "src/library/labs/soundRhythmEngine.ts",
      "src/library/labs/SoundRhythmLabView.tsx",
      "src/library/labs/plantGrowthEngine.ts",
      "src/library/labs/registry.ts",
    ];
    for (const file of checkedFiles) {
      const source = readFileSync(file, "utf8");
      const views = javascriptStrings(source, [], file);
      const plainBroadUnits = views.units.filter((unit: any) => {
        if (unit.compact || !Array.isArray(unit)) return false;
        const words = unit.flatMap((entry: unknown) => wordTokens(String(entry)).filter((w: string) => w.length >= 5));
        return new Set(words).size >= 3;
      });
      expect(plainBroadUnits, `${file} must not declare plain short-word arrays or numeric/boolean word maps`).toEqual([]);
    }
  });
});
