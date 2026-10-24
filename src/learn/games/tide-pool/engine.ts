/** Model review reference: https://oceanservice.noaa.gov/facts/coral_bleach.html (reviewed 2026-10-25). */
import type { LearnEngine, Pace } from "../../types";
import { pickItems } from "../../skills";
import { exact, integer, prediction, scienceSkills, type Prediction } from "../../kit/science";
export const creatures = ["crab", "snail", "fish", "sea-star", "seaweed", "coral"] as const;
export type Creature = (typeof creatures)[number];
export type Pool = {
  light: boolean;
  warm: boolean;
  high: boolean;
  salt: number;
  heat: number;
  algae: number;
  grazed: boolean;
  creatures: Creature[];
};
export const initialPool = (): Pool => ({
  light: true,
  warm: false,
  high: true,
  salt: 2,
  heat: 0,
  algae: 2,
  grazed: false,
  creatures: ["coral", "fish", "seaweed"],
});
export const actions = ["sun", "rain", "temperature", "tide", ...creatures] as const;
export type Action = (typeof actions)[number];
export const availableActions = (p: Pace) =>
  actions.filter((a) => p !== "easy" || (a !== "rain" && a !== "temperature"));
export type Mission = { id: string; text: string; skill: string; pace: number };
export const missions: Mission[] = [
  { id: "coral", text: "Help the coral stay bright", skill: "sci.ocean-habitat", pace: 0 },
  { id: "crab", text: "Make a home for the hermit crab", skill: "sci.living-needs", pace: 0 },
  { id: "snail", text: "Find out what the snails eat", skill: "sci.living-needs", pace: 0 },
  { id: "light", text: "Help seaweed find sunlight", skill: "sci.cause-effect", pace: 1 },
  { id: "rain", text: "Try rain, then bring salty tide water back", skill: "sci.ocean-habitat", pace: 1 },
  { id: "heat", text: "See what lasting warmth does to coral", skill: "sci.cause-effect", pace: 2 },
];
export type TideState = {
  missions: string[];
  index: number;
  pool: Pool;
  action: Action | null;
  guesses: Prediction[];
  result: boolean;
  last: Action | null;
  rained: boolean;
  starter: 0 | 1;
};
export const paceNumber = (p: Pace) => ({ easy: 0, medium: 1, hard: 2 })[p];
export function change(p: Pool, a: Action): Pool {
  let n: Pool = { ...p, creatures: [...p.creatures] };
  if (a === "sun") n.light = !p.light;
  else if (a === "rain") n.salt = Math.max(0, p.salt - 1);
  else if (a === "temperature") n.warm = !p.warm;
  else if (a === "tide") {
    n.high = !p.high;
    if (n.high) n.salt = 2;
  } else n.creatures = creatures.filter((c) => (c === a ? !p.creatures.includes(c) : p.creatures.includes(c)));
  // A time-lapse turn: lit submerged algae regrow, grazing snails scrape patches.
  n.algae = Math.min(3, p.algae + (n.light && n.high ? 1 : 0));
  n.grazed = n.high && n.creatures.includes("snail") && n.algae > 0;
  if (n.grazed) n.algae = Math.max(0, n.algae - 2);
  n.heat = n.warm && n.creatures.includes("coral") ? Math.min(2, p.heat + 1) : 0;
  return n;
}
export function explanation(p: Pool, a: Action) {
  if (a === "sun")
    return p.light ? "Seaweed uses sunlight to make food." : "With no sunlight, seaweed cannot make food.";
  if (a === "rain") return "Fresh rain makes the pool less salty. Too much can stress ocean animals.";
  if (a === "temperature")
    return p.warm
      ? "Warmth over time can make coral lose its tiny algae and turn pale."
      : "Cooler water can help coral recover over time.";
  if (a === "tide")
    return p.high
      ? "The incoming tide covers animals and brings salty seawater."
      : "Low tide leaves less water. Fish and sea stars need to stay underwater.";
  return {
    crab: "A hermit crab needs a shell to protect its soft body. Our pool has empty shells.",
    snail: "Our grazing snails scrape tiny algae from rocks.",
    fish: "Fish breathe oxygen from water with their gills.",
    "sea-star": "Sea stars are animals that need seawater.",
    seaweed: "Seaweed needs light and water to grow.",
    coral: "Corals are animals. Tiny algae inside many corals share food made with sunlight.",
  }[a];
}
export function choices(a: Action): [string, string] {
  return a === "sun"
    ? ["Food from light", "No food from light"]
    : a === "rain"
      ? ["Less salty", "More salty"]
      : a === "temperature"
        ? ["Coral stays bright", "Coral may turn pale"]
        : a === "tide"
          ? ["Animals covered", "Animals exposed"]
          : ["A living neighbor", "An empty space"];
}
/** Read the outcome picture from an already-updated pool. */
export function observed(p: Pool, a: Action): Prediction {
  return a === "sun"
    ? p.light
      ? 0
      : 1
    : a === "rain"
      ? 0
      : a === "temperature"
        ? p.warm
          ? 1
          : 0
        : a === "tide"
          ? p.high
            ? 0
            : 1
          : p.creatures.includes(a)
            ? 0
            : 1;
}
export function expected(p: Pool, a: Action): Prediction {
  return observed(change(p, a), a);
}
export function missionMet(s: TideState) {
  const p = s.pool,
    id = s.missions[s.index];
  return id === "coral"
    ? p.creatures.includes("coral") && !p.warm && p.high && p.salt === 2 && p.light
    : id === "crab"
      ? p.creatures.includes("crab") && p.high && p.salt === 2
      : id === "snail"
        ? p.creatures.includes("snail") && p.grazed
        : id === "light"
          ? p.creatures.includes("seaweed") && p.light && p.high
          : id === "rain"
            ? s.rained && p.high && p.salt === 2
            : p.creatures.includes("coral") && p.heat === 2;
}
export function tryChange(s: TideState, together: boolean): TideState {
  if (!s.action || s.result || s.guesses.length !== (together ? 2 : 1) || s.index >= s.missions.length) return s;
  return {
    ...s,
    pool: change(s.pool, s.action),
    result: true,
    last: s.action,
    rained: s.rained || s.action === "rain",
  };
}
export function nextExperiment(s: TideState): TideState {
  if (!s.result) return s;
  const met = missionMet(s);
  return { ...s, index: s.index + (met ? 1 : 0), action: null, guesses: [], result: false, last: null };
}
export const engine: LearnEngine<TideState> = {
  id: "tide-pool",
  name: "Tide Pool Lab",
  island: "science",
  tagline: "Make a prediction. Change a living pool.",
  description: "Try changes and discover what your ocean neighbors need.",
  help: "Choose a change, predict with pictures, then try it. Nothing is lost if the result surprises you. With a grown-up, take turns choosing changes and compare both predictions. In real life, different species respond differently, and changes take much longer.",
  helpAudio: "tide-pool-help",
  color: "#2C6E8F",
  surface: "#DDEFF5",
  modes: ["solo", "together"],
  skills: { ...scienceSkills, "sci.living-needs": "What living things need", "sci.ocean-habitat": "Ocean homes" },
  paceHelp: {
    easy: "Three creature missions.",
    medium: "Add light and salty-water missions.",
    hard: "Explore lasting heat as well.",
  },
  create: (o, c) => ({
    missions: pickItems(
      missions.filter((m) => m.pace <= paceNumber(o.pace)),
      c.skills,
      3 + paceNumber(o.pace),
      c.rng,
      c.today
    ).map((m) => m.id),
    index: 0,
    pool: initialPool(),
    action: null,
    guesses: [],
    result: false,
    last: null,
    rained: false,
    starter: c.starter,
  }),
  validate: (x, o): x is TideState => {
    if (!exact(x, ["missions", "index", "pool", "action", "guesses", "result", "last", "rained", "starter"]))
      return false;
    const s = x as TideState,
      p = s.pool;
    return (
      Array.isArray(s.missions) &&
      s.missions.length === 3 + paceNumber(o.pace) &&
      new Set(s.missions).size === s.missions.length &&
      s.missions.every((id) => missions.some((m) => m.id === id && m.pace <= paceNumber(o.pace))) &&
      integer(s.index, 0, s.missions.length) &&
      exact(p, ["light", "warm", "high", "salt", "heat", "algae", "grazed", "creatures"]) &&
      typeof p.light === "boolean" &&
      typeof p.warm === "boolean" &&
      typeof p.high === "boolean" &&
      integer(p.salt, 0, 2) &&
      integer(p.heat, 0, 2) &&
      integer(p.algae, 0, 3) &&
      typeof p.grazed === "boolean" &&
      Array.isArray(p.creatures) &&
      (!p.grazed || (p.high && p.creatures.includes("snail") && p.algae <= 1)) &&
      (!(p.high && p.light && p.creatures.includes("snail")) || p.grazed) &&
      p.creatures.length <= 6 &&
      new Set(p.creatures).size === p.creatures.length &&
      p.creatures.every((c) => creatures.includes(c)) &&
      (p.warm && p.creatures.includes("coral") ? p.heat >= 1 : p.heat === 0) &&
      (s.action === null || availableActions(o.pace).includes(s.action)) &&
      Array.isArray(s.guesses) &&
      s.guesses.length <= (o.mode === "together" ? 2 : 1) &&
      s.guesses.every(prediction) &&
      typeof s.result === "boolean" &&
      typeof s.rained === "boolean" &&
      prediction(s.starter) &&
      (s.result
        ? s.last === s.action && s.action !== null && s.guesses.length === (o.mode === "together" ? 2 : 1)
        : s.last === null) &&
      (s.action !== null || s.guesses.length === 0) &&
      (s.index < s.missions.length || (!s.result && s.action === null && missionMet({ ...s, index: s.index - 1 })))
    );
  },
  outcome: (s) => (s.index === s.missions.length ? "done" : null),
  turn: (s) => s.starter,
};
