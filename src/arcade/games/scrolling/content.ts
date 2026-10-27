import { allLevelIds, levelNumber, nextRandom, worldOf, type ArcadeLevel, type LevelId } from "../../types";
export type ScrollGame = "fruit-bat-flight" | "lagoon-run";
export type ScrollLevel = ArcadeLevel & { target: number; speed: number; spacing: number; gap: number; storm: boolean; rank: number };
export type MathGate = { a: number; b: number; subtract: boolean; answer: number; choices: [number, number, number] };
export function mathGate(seed: number, index: number): { seed: number; fact: MathGate } {
  let n: number; [seed, n] = nextRandom(seed); const limit = index < 5 ? 5 : 10, a = 1 + Math.floor(n * limit);
  [seed, n] = nextRandom(seed); const b = 1 + Math.floor(n * (index < 5 ? 5 : a));
  const subtract = index >= 5 && index % 2 === 0, answer = subtract ? a - b : a + b;
  const choices: [number, number, number] = [answer, answer + 1, answer > 0 ? answer - 1 : answer + 2];
  [seed, n] = nextRandom(seed); const shift = Math.floor(n * 3);
  return { seed, fact: { a, b, subtract, answer, choices: [choices[shift], choices[(shift + 1) % 3], choices[(shift + 2) % 3]] } };
}
export const equation = (f: MathGate) => `${f.a} ${f.subtract ? "−" : "+"} ${f.b} = ?`;
export function levelsFor(game: ScrollGame): readonly ScrollLevel[] {
  return allLevelIds.map(id => {
    const index = levelNumber(id), world = worldOf(id), rank = ({ w1: 0, w2: 1, w3: 2, w4: 3, w5: 4, w6: 5, learn: 0 })[world], learn = world === "learn";
    const target = learn ? 3 + Math.floor((index - 1) / 3) : 4 + rank * 2 + Math.floor((index - 1) / 2);
    const collectible = game === "fruit-bat-flight" ? "fruit" : "shells";
    return { id, world, index, rank, target, speed: learn ? .105 : .155 + Math.min(2, rank) * .035 + Math.max(0, rank - 2) * .008 + (index - 1) * .004,
      spacing: learn ? .6 : .61 - Math.min(2, rank) * .025, gap: Math.max(.33, .55 - Math.min(2, rank) * .065 - Math.max(0, rank - 2) * .008 - (index - 1) * .009), storm: world === "w3" && index >= 5,
      name: learn ? ["Little sums", "Number trail", "Add together", "Bright answers", "Sums to twenty", "Take some away", "Number explorer", "Math adventurer"][index - 1] : game === "fruit-bat-flight" ? ["First flutter", "Fruit in the trees", "Follow the glow", "Palm pathways", "A little breeze", "Forest explorer", "Golden wings", "Home before sunrise"][index - 1] : ["To the water", "Crab dance", "Under the palms", "Fishing village", "Shell trail", "Around the bend", "Sea breeze", "Lagoon adventurer"][index - 1],
      goals: [learn ? `Find ${target} answers` : `Pass ${target} ${game === "fruit-bat-flight" ? "palms" : "trail markers"}`, `Collect ${Math.ceil(target * .5)} ${collectible}`, `Collect ${target} ${collectible}`] };
  });
}
export const flightLevels = levelsFor("fruit-bat-flight"), runLevels = levelsFor("lagoon-run");
export const flightLevel = (id: LevelId) => flightLevels.find(l => l.id === id)!;
export const runLevel = (id: LevelId) => runLevels.find(l => l.id === id)!;
/** Canonical authored content only. Runtime states are never accepted as saves. */
export const canonicalLevel = (v: unknown, levels: readonly ScrollLevel[]): v is ScrollLevel | "endless" => v === "endless" || levels.some(l => JSON.stringify(l) === JSON.stringify(v));
export const finite = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
export const uint = (v: unknown, max = 99999999): v is number => finite(v, 0, max) && Number.isInteger(v);
export const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export function validFact(v: unknown): v is MathGate {
  if (!record(v) || !uint(v.a, 10) || !uint(v.b, 10) || typeof v.subtract !== "boolean" || !uint(v.answer, 20) || v.answer !== (v.subtract ? v.a - v.b : v.a + v.b) || !Array.isArray(v.choices) || v.choices.length !== 3) return false;
  return v.choices.every(n => uint(n, 21)) && new Set(v.choices).size === 3 && v.choices.includes(v.answer);
}
