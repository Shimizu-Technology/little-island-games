export type IslandPlantId = "coconut-palm" | "hibiscus" | "mango-tree";
export type PlantHealthMood = "thriving" | "thirsty" | "shady" | "soaked";

export interface PlantSpeciesMeta {
  id: IslandPlantId;
  title: string;
  description: string;
  idealSunMin: number;
  idealWaterMin: number;
  idealWaterMax: number;
  bloomColor: string;
  accentColor: string;
  fact: string;
}

export const ISLAND_PLANTS: readonly PlantSpeciesMeta[] = [
  {
    id: "coconut-palm",
    title: "Coconut Palm",
    description: "Coconuts",
    idealSunMin: 3,
    idealWaterMin: 2,
    idealWaterMax: 4,
    bloomColor: "#7E5734",
    accentColor: "#3D7A47",
    fact: "Guam coconut palms love warm sunshine and sandy soil that drains rainwater!",
  },
  {
    id: "hibiscus",
    title: "Hibiscus Flower",
    description: "Bright Blooms",
    idealSunMin: 3,
    idealWaterMin: 3,
    idealWaterMax: 4,
    bloomColor: "#E05263",
    accentColor: "#B5384B",
    fact: "Hibiscus flowers open wide in tropical sun and drink lots of island rain!",
  },
  {
    id: "mango-tree",
    title: "Mango Tree",
    description: "Sweet Mangoes",
    idealSunMin: 3,
    idealWaterMin: 2,
    idealWaterMax: 4,
    bloomColor: "#F2A92C",
    accentColor: "#B87216",
    fact: "Mango trees send deep roots down into the earth to grow big canopies and golden fruit!",
  },
];

export const PLANT_BY_ID: Readonly<Record<IslandPlantId, PlantSpeciesMeta>> = {
  "coconut-palm": ISLAND_PLANTS[0],
  hibiscus: ISLAND_PLANTS[1],
  "mango-tree": ISLAND_PLANTS[2],
};

export type PlantStage = 0 | 1 | 2 | 3 | 4;

export interface PlantGrowthState {
  plantId: IslandPlantId;
  sunlight: number; // 1..5
  rainwater: number; // 1..5
  day: number;
  growth: number; // 0..100
  stage: PlantStage;
  mood: PlantHealthMood;
  wasEverThirsty: boolean;
  recoveredFromThirst: boolean;
  feedback: string;
  challengeIndex: number;
}

export function stageFromGrowth(growth: number): PlantStage {
  if (growth >= 90) return 4;
  if (growth >= 62) return 3;
  if (growth >= 34) return 2;
  if (growth >= 12) return 1;
  return 0;
}

export function stageTitle(stage: PlantStage, plantId: IslandPlantId): string {
  const species = PLANT_BY_ID[plantId];
  switch (stage) {
    case 0:
      return "Resting Seed";
    case 1:
      return "Roots & Tiny Sprout";
    case 2:
      return "Growing Green Shoot";
    case 3:
      return plantId === "hibiscus" ? "Flower Buds Forming" : "Leafy Young Tree";
    case 4:
      return `Full Grown with ${species.description}!`;
  }
}

export function evaluatePlantMood(sunlight: number, rainwater: number): PlantHealthMood {
  if (rainwater <= 1) return "thirsty";
  if (sunlight <= 1) return "shady";
  if (rainwater >= 5 && sunlight <= 2) return "soaked";
  return "thriving";
}

export function createPlantGrowthState(plantId: IslandPlantId = "coconut-palm"): PlantGrowthState {
  return {
    plantId,
    sunlight: 3,
    rainwater: 3,
    day: 0,
    growth: 0,
    stage: 0,
    mood: "thriving",
    wasEverThirsty: false,
    recoveredFromThirst: false,
    feedback: `Your ${PLANT_BY_ID[plantId].title} seed is tucked in warm island soil. Adjust Sunlight and Rainwater, then tap Next Day!`,
    challengeIndex: 0,
  };
}

export interface PlantChallenge {
  id: string;
  prompt: string;
  hint: string;
  check: (state: PlantGrowthState) => boolean;
}

export const PLANT_CHALLENGES: readonly PlantChallenge[] = [
  {
    id: "sprout-roots",
    prompt: "Help your seed sprout roots and a green shoot!",
    hint: "Set Sunlight and Rainwater to 3 or 4 and tap Next Day twice!",
    check: (state) => state.stage >= 2,
  },
  {
    id: "full-harvest",
    prompt: "Grow any island plant all the way to full blooms or fruit!",
    hint: "Keep Sunlight and Rainwater balanced and tap Next Day until Day 5 or 6!",
    check: (state) => state.stage === 4,
  },
  {
    id: "help-thirsty-plant",
    prompt: "See what happens when soil gets dry, then rescue your plant with rain!",
    hint: "Try Next Day with Rainwater at 1 to see drooping leaves, then raise Rainwater to 3+ and tap Next Day!",
    check: (state) => state.recoveredFromThirst,
  },
];

export type PlantGrowthAction =
  | { type: "select-plant"; plantId: IslandPlantId }
  | { type: "set-sunlight"; value: number }
  | { type: "set-rainwater"; value: number }
  | { type: "next-day" }
  | { type: "next-challenge" }
  | { type: "reset" };

const clamp5 = (n: number) => Math.max(1, Math.min(5, Math.round(n)));

export function reducePlantGrowth(state: PlantGrowthState, action: PlantGrowthAction): PlantGrowthState {
  switch (action.type) {
    case "select-plant":
      return {
        ...createPlantGrowthState(action.plantId),
        challengeIndex: state.challengeIndex,
      };
    case "set-sunlight": {
      const sunlight = clamp5(action.value);
      return { ...state, sunlight, mood: evaluatePlantMood(sunlight, state.rainwater) };
    }
    case "set-rainwater": {
      const rainwater = clamp5(action.value);
      return { ...state, rainwater, mood: evaluatePlantMood(state.sunlight, rainwater) };
    }
    case "next-day": {
      const species = PLANT_BY_ID[state.plantId];
      const mood = evaluatePlantMood(state.sunlight, state.rainwater);
      const nextDay = state.day + 1;
      let delta = 0;
      let feedback = "";

      if (mood === "thirsty") {
        delta = 2;
        feedback = "Your plant looks thirsty with drooping leaves! Turn up Rainwater so roots can drink.";
      } else if (mood === "shady") {
        delta = 5;
        feedback = "It is very shady today! Leaves use Sunlight to make plant food — try turning Sunlight higher.";
      } else if (mood === "soaked") {
        delta = 8;
        feedback = "Big puddles formed in the soil! Roots also need tiny air pockets — add more Sunlight or less rain.";
      } else {
        const sunBonus = state.sunlight >= species.idealSunMin ? 12 : 8;
        const waterBonus =
          state.rainwater >= species.idealWaterMin && state.rainwater <= species.idealWaterMax ? 12 : 8;
        delta = sunBonus + waterBonus;
      }

      const nextGrowth = Math.min(100, state.growth + delta);
      const nextStage = stageFromGrowth(nextGrowth);

      if (!feedback) {
        if (nextStage === 4) {
          feedback = `Hooray! Your ${species.title} grew ${species.description}! ${species.fact}`;
        } else if (nextStage > state.stage) {
          feedback = `Day ${nextDay}: New stage unlocked — ${stageTitle(nextStage, state.plantId)}!`;
        } else {
          feedback = `Day ${nextDay}: Your ${species.title} drank up water and sunlight and grew taller!`;
        }
      }

      const wasEverThirsty = state.wasEverThirsty || mood === "thirsty";
      const recoveredFromThirst = state.recoveredFromThirst || (wasEverThirsty && mood === "thriving");

      return {
        ...state,
        day: nextDay,
        growth: nextGrowth,
        stage: nextStage,
        mood,
        wasEverThirsty,
        recoveredFromThirst,
        feedback,
      };
    }
    case "next-challenge":
      return { ...state, challengeIndex: (state.challengeIndex + 1) % PLANT_CHALLENGES.length };
    case "reset":
      return createPlantGrowthState(state.plantId);
  }
}
