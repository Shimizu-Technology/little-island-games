export type IslandStage = 0 | 1 | 2 | 3 | 4 | 5;

export interface IslandStageInfo {
  stage: IslandStage;
  title: string;
  discovery: string;
  elevationRatio: number;
  hasLava: boolean;
  hasCoral: boolean;
  hasPalms: boolean;
}

export const ISLAND_STAGES: readonly IslandStageInfo[] = [
  {
    stage: 0,
    title: "Deep Pacific Seafloor",
    discovery: "Far below the ocean waves, hot magma waits beneath Earth's rocky crust. Turn up Heat and Pressure, then tap Erupt!",
    elevationRatio: 0.14,
    hasLava: false,
    hasCoral: false,
    hasPalms: false,
  },
  {
    stage: 1,
    title: "Underwater Seamount",
    discovery: "Hot melted rock pushed upward and hardened in cold seawater, forming a growing underwater mountain!",
    elevationRatio: 0.42,
    hasLava: true,
    hasCoral: false,
    hasPalms: false,
  },
  {
    stage: 2,
    title: "Erupting Volcanic Peak",
    discovery: "Boom! Your volcano burst right through the Pacific waves with glowing lava and billowing steam!",
    elevationRatio: 0.72,
    hasLava: true,
    hasCoral: false,
    hasPalms: false,
  },
  {
    stage: 3,
    title: "Cooled Volcanic Rock Island",
    discovery: "Ocean breezes and rain cooled the lava into dark volcanic rock — a brand-new Pacific island is born!",
    elevationRatio: 0.76,
    hasLava: false,
    hasCoral: false,
    hasPalms: false,
  },
  {
    stage: 4,
    title: "Living Coral Reef & Lagoon",
    discovery: "Warm, sunlit tropical seawater lets tiny coral polyps build a bright protective reef ring around the island!",
    elevationRatio: 0.78,
    hasLava: false,
    hasCoral: true,
    hasPalms: false,
  },
  {
    stage: 5,
    title: "Tropical Island Like Guam!",
    discovery: "Waves ground coral into soft sandy beaches, wind and sea brought seeds, and lush green coconut palms now sway in the breeze!",
    elevationRatio: 0.8,
    hasLava: false,
    hasCoral: true,
    hasPalms: true,
  },
];

export interface VolcanoIslandState {
  magmaHeat: number; // 1..5
  pressure: number; // 1..5
  reefWarmth: number; // 1..5
  stage: IslandStage;
  eruptions: number;
  feedback: string;
  challengeIndex: number;
}

export function createVolcanoIslandState(): VolcanoIslandState {
  return {
    magmaHeat: 3,
    pressure: 3,
    reefWarmth: 4,
    stage: 0,
    eruptions: 0,
    feedback: ISLAND_STAGES[0].discovery,
    challengeIndex: 0,
  };
}

export interface VolcanoChallenge {
  id: string;
  prompt: string;
  hint: string;
  check: (state: VolcanoIslandState) => boolean;
}

export const VOLCANO_CHALLENGES: readonly VolcanoChallenge[] = [
  {
    id: "break-surface",
    prompt: "Erupt the undersea volcano until it rises above the ocean waves!",
    hint: "Set Magma Heat and Pressure to 3 or higher, then tap Erupt! twice.",
    check: (state) => state.stage >= 2,
  },
  {
    id: "grow-coral",
    prompt: "Cool the lava and grow a colorful living coral reef around your island!",
    hint: "Keep Reef Warmth at 3 or higher, cool the rock, then tap Grow Coral Reef!",
    check: (state) => state.stage >= 4,
  },
  {
    id: "guam-island",
    prompt: "Complete a full Guam-style tropical island with sandy beaches and palm trees!",
    hint: "Once your coral reef is growing, tap Sprout Palms & Beach!",
    check: (state) => state.stage === 5,
  },
];

export type VolcanoIslandAction =
  | { type: "set-heat"; value: number }
  | { type: "set-pressure"; value: number }
  | { type: "set-reef-warmth"; value: number }
  | { type: "erupt" }
  | { type: "cool-lava" }
  | { type: "grow-reef" }
  | { type: "sprout-island" }
  | { type: "next-challenge" }
  | { type: "reset" };

const clampLevel = (n: number) => Math.max(1, Math.min(5, Math.round(n)));

export function reduceVolcanoIsland(state: VolcanoIslandState, action: VolcanoIslandAction): VolcanoIslandState {
  switch (action.type) {
    case "set-heat":
      return { ...state, magmaHeat: clampLevel(action.value) };
    case "set-pressure":
      return { ...state, pressure: clampLevel(action.value) };
    case "set-reef-warmth":
      return { ...state, reefWarmth: clampLevel(action.value) };
    case "erupt": {
      const power = state.magmaHeat + state.pressure;
      if (power < 6) {
        return {
          ...state,
          feedback: "The volcano rumbled gently! Pump Magma Heat and Pressure higher so lava can burst upward.",
        };
      }
      if (state.stage === 0) {
        const jumpStage: IslandStage = power >= 9 ? 2 : 1;
        return {
          ...state,
          stage: jumpStage,
          eruptions: state.eruptions + 1,
          feedback: ISLAND_STAGES[jumpStage].discovery,
        };
      }
      if (state.stage === 1) {
        return {
          ...state,
          stage: 2,
          eruptions: state.eruptions + 1,
          feedback: ISLAND_STAGES[2].discovery,
        };
      }
      return {
        ...state,
        eruptions: state.eruptions + 1,
        feedback:
          state.stage === 2
            ? "Another fiery lava splash made the island peak even wider! Now tap Cool Lava into Rock."
            : "Your volcano is already formed above the waves! Tap Reset to build a brand-new island.",
      };
    }
    case "cool-lava": {
      if (state.stage < 2) {
        return {
          ...state,
          feedback: "First erupt the volcano above the ocean waves so it can cool into an island!",
        };
      }
      if (state.stage === 2) {
        return {
          ...state,
          stage: 3,
          feedback: ISLAND_STAGES[3].discovery,
        };
      }
      return { ...state, feedback: "The volcanic rock is already cool and solid!" };
    }
    case "grow-reef": {
      if (state.stage < 3) {
        return {
          ...state,
          feedback: "Coral needs cool, solid rock near sunlit water first. Erupt and cool your island!",
        };
      }
      if (state.reefWarmth < 3) {
        return {
          ...state,
          feedback: "Brr! The ocean is too chilly for tropical coral. Turn Reef Warmth up to 3 or higher!",
        };
      }
      if (state.stage === 3) {
        return {
          ...state,
          stage: 4,
          feedback: ISLAND_STAGES[4].discovery,
        };
      }
      return { ...state, feedback: "Your coral reef is already thriving with colorful polyps!" };
    }
    case "sprout-island": {
      if (state.stage < 4) {
        return {
          ...state,
          feedback: "Grow a living coral reef first so waves can make warm sandy beaches!",
        };
      }
      return {
        ...state,
        stage: 5,
        feedback: ISLAND_STAGES[5].discovery,
      };
    }
    case "next-challenge":
      return { ...state, challengeIndex: (state.challengeIndex + 1) % VOLCANO_CHALLENGES.length };
    case "reset":
      return createVolcanoIslandState();
  }
}
