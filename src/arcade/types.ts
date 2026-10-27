/** Stable IDs shared with the later arcade slices. No UI or native imports in this API. */
export const arcadeIds = ["reef-builder", "shell-song", "rail-parade", "crab-crossing", "palm-patrol", "beach-ball", "fruit-bat-flight", "lagoon-run", "canoe-cargo"] as const;
export type ArcadeId = typeof arcadeIds[number];
export type WorldId = "w1" | "w2" | "w3" | "learn";
export type LevelId = `${WorldId}-${number}`;
export type Stars = 1 | 2 | 3;
export type ArcadeLevel = { id: LevelId; world: WorldId; index: number; name: string; goals: readonly [string, string, string] };
export type ArcadeWorld = { id: WorldId; name: string; detail: string; stars: number; learning?: boolean };
export type ArcadeGame = { id: ArcadeId; name: string; tagline: string; color: string; surface: string; subject: "math" | "reading"; twoPlayer: boolean; worlds: readonly ArcadeWorld[]; hero: string };
export type ArcadeResult = { cleared: boolean; stars: 0 | Stars; score: number; detail: string };
/** Engines are deterministic. dt is seconds; a real-time game consumes exactly 1/60 per step. */
export type ArcadeEngine<State, Input, Level extends ArcadeLevel = ArcadeLevel> = {
  create: (level: Level | "endless", seed: number, helper: boolean) => State;
  step?: (state: State, input: Input, dt: number) => State;
  reduce: (state: State, input: Input) => State;
  result: (state: State) => ArcadeResult | null;
  validate: (state: unknown) => state is State;
};
export type ArcadeExpected = { epoch: number; learner: string };
export const worldIds: readonly WorldId[] = ["w1", "w2", "w3", "learn"];
export const validLevelId = (v: unknown): v is LevelId => typeof v === "string" && /^(w[123]|learn)-[1-8]$/.test(v);
export const worldOf = (id: LevelId): WorldId => id.split("-")[0] as WorldId;
export const levelNumber = (id: LevelId) => Number(id.split("-")[1]);
/** Small reproducible unsigned RNG; no hidden Math.random calls in game rules. */
export function nextRandom(seed: number): [number, number] {
  const next = (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0;
  return [next, next / 0x100000000];
}
export function starCount(stars: Partial<Record<LevelId, Stars>>): number { return Object.values(stars).reduce<number>((sum, n) => sum + (n ?? 0), 0); }
export const allLevelIds = worldIds.flatMap(world => Array.from({ length: 8 }, (_, i) => `${world}-${i + 1}` as LevelId));
