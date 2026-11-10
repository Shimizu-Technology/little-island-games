/**
 * AR-10 Arcade dares. A dare is an optional mark chosen before Start. It is proved only by
 * the engine's own terminal facts on an accepted, cleared finish, and it is saved as one bit
 * in the learner's Challenge `dares` bitmap. Nothing mid-round is saved.
 *
 * Rules: no dare needs Helper off, a rival or court setting, three stars or a hit-free level.
 * Every dare has a legal-play witness in tests/arcade-dares.test.ts.
 */
import type { Bank, Dare, PuzzleRef, SaveCatalog } from "../state/challenge";
import { sha256Hex } from "../puzzles/sha256";
import { arcadeIds, type ArcadeFacts, type ArcadeId, type LevelId } from "./types";

export type ArcadeDare = { slot: number; game: ArcadeId; level: LevelId; fact: keyof ArcadeFacts; at: "least" | "most"; value: number; title: string; detail: string };

/** Inline bank slots 500–508, one per game, far above the packed puzzle range that grows from 0. */
export const arcadeDareBank: Record<ArcadeId, number> = Object.fromEntries(arcadeIds.map((id, i) => [id, 500 + i])) as Record<ArcadeId, number>;
/** Dare slots 4000–4071: eight per game, in shelf-independent `arcadeIds` order. Append only. */
const slot = (game: ArcadeId, n: number) => 4000 + arcadeIds.indexOf(game) * 8 + n;

export const arcadeDares: readonly ArcadeDare[] = [
  { slot: slot("reef-builder", 0), game: "reef-builder", level: "w1-4", fact: "fish", at: "least", value: 4, title: "Fish friends", detail: "Free 4 fish. Clear a line through a fish to let it swim." },
  { slot: slot("reef-builder", 1), game: "reef-builder", level: "w5-4", fact: "fish", at: "least", value: 8, title: "Big rescue", detail: "Free 8 fish around the rocks." },
  { slot: slot("shell-song", 0), game: "shell-song", level: "w1-6", fact: "replays", at: "most", value: 0, title: "Your own ears", detail: "Play every song back without pressing Replay. A slip is fine." },
  { slot: slot("shell-song", 1), game: "shell-song", level: "w3-6", fact: "replays", at: "most", value: 0, title: "Six-shell ears", detail: "Play every song back without pressing Replay. A slip is fine." },
  { slot: slot("rail-parade", 0), game: "rail-parade", level: "w1-5", fact: "streak", at: "least", value: 6, title: "Chick chain", detail: "Collect 6 chicks in a row without a bump." },
  { slot: slot("rail-parade", 1), game: "rail-parade", level: "w4-3", fact: "streak", at: "least", value: 12, title: "Long parade", detail: "Collect 12 chicks in a row without a bump." },
  { slot: slot("crab-crossing", 0), game: "crab-crossing", level: "w2-2", fact: "clean", at: "least", value: 1, title: "Clean crossing", detail: "Make one whole crossing without a bump." },
  { slot: slot("crab-crossing", 1), game: "crab-crossing", level: "w5-3", fact: "clean", at: "least", value: 2, title: "Two clean crossings", detail: "Make two whole crossings without a bump." },
  { slot: slot("palm-patrol", 0), game: "palm-patrol", level: "w1-5", fact: "aim", at: "least", value: 60, title: "Sharp aim", detail: "Land 6 of every 10 tosses. Bumps are fine." },
  { slot: slot("palm-patrol", 1), game: "palm-patrol", level: "w3-4", fact: "aim", at: "least", value: 70, title: "Sharper aim", detail: "Land 7 of every 10 tosses. Bumps are fine." },
  { slot: slot("beach-ball", 0), game: "beach-ball", level: "w2-1", fact: "rally", at: "least", value: 6, title: "Long rally", detail: "Keep one rally going for 6 hits." },
  { slot: slot("beach-ball", 1), game: "beach-ball", level: "w4-1", fact: "rally", at: "least", value: 8, title: "Spin rally", detail: "Keep one rally going for 8 hits." },
  { slot: slot("fruit-bat-flight", 0), game: "fruit-bat-flight", level: "w1-6", fact: "fruit", at: "least", value: 15, title: "Fruit feast", detail: "Collect 15 fruit. Bumps are fine." },
  { slot: slot("fruit-bat-flight", 1), game: "fruit-bat-flight", level: "w4-4", fact: "fruit", at: "least", value: 28, title: "Windy feast", detail: "Collect 28 fruit in the gusts. Bumps are fine." },
  { slot: slot("lagoon-run", 0), game: "lagoon-run", level: "w1-3", fact: "shells", at: "least", value: 40, title: "Shell trail", detail: "Collect 40 shells. Bumps are fine." },
  { slot: slot("lagoon-run", 1), game: "lagoon-run", level: "w3-5", fact: "shells", at: "least", value: 70, title: "Sunset shells", detail: "Collect 70 shells. Bumps are fine." },
  { slot: slot("canoe-cargo", 0), game: "canoe-cargo", level: "w1-6", fact: "rows", at: "least", value: 2, title: "Two at once", detail: "Send two canoes with one piece." },
  { slot: slot("canoe-cargo", 1), game: "canoe-cargo", level: "w5-2", fact: "rows", at: "least", value: 3, title: "Three at once", detail: "Send three canoes with one piece." },
];

export const daresFor = (game: ArcadeId, level: LevelId | "endless") => arcadeDares.filter(d => d.game === game && d.level === level);
export const arcadeDare = (slotId: number) => arcadeDares.find(d => d.slot === slotId);
const ownDares = (game: ArcadeId) => arcadeDares.filter(d => d.game === game);
/** One bank entry per dare. The hash binds the dare's meaning, so tuning a level's speed keeps its mark. */
export const dareMeaning = (d: ArcadeDare) => JSON.stringify({ game: d.game, level: d.level, fact: d.fact, at: d.at, value: d.value });
export function dareRef(d: ArcadeDare): PuzzleRef {
  const bank = arcadeDareBank[d.game], puzzle = ownDares(d.game).indexOf(d);
  return { bank, puzzle, engine: d.game, rules: 1, hash: sha256Hex(dareMeaning(d)) };
}
/** Proved only by a cleared terminal result with the engine's own facts. */
export function dareMet(d: ArcadeDare, cleared: boolean, facts: ArcadeFacts | undefined): boolean {
  const n = facts?.[d.fact];
  return cleared && typeof n === "number" && (d.at === "least" ? n >= d.value : n <= d.value);
}

/** Inline banks and pick-up dares, registered with the frozen manifest. No codec: real-time rounds never pause. */
export function arcadeDareCatalog(): SaveCatalog {
  const banks = new Map<number, Bank>(), dares = new Map<number, Dare>();
  for (const game of arcadeIds) {
    const own = ownDares(game);
    if (!own.length) continue;
    const slotId = arcadeDareBank[game];
    banks.set(slotId, { slot: slotId, engine: game, rules: 1, entries: own.map((d, i) => ({ ordinal: slotId * 1024 + i, hash: sha256Hex(dareMeaning(d)) })), awards: own.map(() => 0), cove: false });
    own.forEach((d, i) => dares.set(d.slot, { kind: "pick-up", help: "allowed", bank: slotId, puzzle: i }));
  }
  return { banks, dares, codecs: new Map(), contexts: new Set() };
}
