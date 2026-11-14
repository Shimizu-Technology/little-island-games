import { numberLimit, numbersStatus, remainingTotal, type NumbersState } from "../games/numbers";
import { exactKeys, plain, uint } from "./saveBits";
import type { Save } from "./validation";

/** Scores belong to one learner. Different board sizes are never compared. */
export type NumberRecords = { version: 1; bestRemaining: Partial<Record<6 | 9 | 12, number>> };
export function validNumberRecords(v: unknown): v is NumberRecords {
  return plain(v) && exactKeys(v, ["version", "bestRemaining"]) && v.version === 1 && plain(v.bestRemaining) &&
    Object.entries(v.bestRemaining).every(([size, score]) => ["6", "9", "12"].includes(size) && uint(score, Number(size) * (Number(size) + 1) / 2));
}
function keep(records: NumberRecords | undefined, size: 6 | 9 | 12, score: number): NumberRecords {
  const old = records?.bestRemaining[size];
  if (old !== undefined && old <= score) return records!;
  return { version: 1, bestRemaining: { ...records?.bestRemaining, [size]: score } };
}
/** Only a transition in this owner's current round can record a finished total. */
export function recordNumberRound(previous: NumbersState | undefined, next: NumbersState | undefined, records?: NumberRecords): NumberRecords | undefined {
  if (!previous || !next || previous.id !== next.id || numberLimit(previous) !== numberLimit(next) || numbersStatus(previous) !== "playing" || numbersStatus(next) === "playing") return records;
  return keep(records, numberLimit(next), remainingTotal(next));
}
/** F1 extension in unreleased envelope 3/profile 2: enrich only canonical, owned rounds.
 * No guessed owner for legacy unassigned data; preserve every original round unchanged. */
export function migrateNumberRecords(save: Save): Save {
  if (save.version !== 3 || save.profiles?.version !== 2) return save;
  let changed = false;
  const people = Object.fromEntries(Object.entries(save.profiles.people).map(([owner, p]) => {
    const s = p.sessions.numbers;
    if (s?.game !== "numbers" || numbersStatus(s) === "playing") return [owner, p];
    const numberRecords = keep(p.numberRecords, numberLimit(s), remainingTotal(s));
    if (numberRecords === p.numberRecords) return [owner, p];
    changed = true;
    return [owner, { ...p, numberRecords }];
  }));
  return changed ? { ...save, numberRecords: people[save.learning?.active ?? "family"].numberRecords, profiles: { ...save.profiles, people } } : save;
}
