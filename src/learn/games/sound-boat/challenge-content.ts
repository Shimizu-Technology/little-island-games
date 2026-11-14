import type { DareRule, Puzzle } from "../../../challenge/types";
import { sha256Hex } from "../../../puzzles/sha256";
import { canonical } from "../../../puzzles/descriptor";
import { taskOfParts, type BuildTask } from "../../reading/build";
import type { PartsWord } from "../../reading/records";
import { admittedParts } from "../../reading/admitted";
import type { Descriptor } from "./challenge-engine";

/** Banks 440-444 hold Levels 1-5 (445-449 stay spare); dares 3600-3699 are the first 25 puzzles of Levels 2-5. */
export const BANK_BASE = 440;
export const DARE_BASE = 3600;
export const DARES_PER_LEVEL = 25;
const ruleOf = (level: number): { rule: DareRule; label: string } | null =>
  level === 2 || level === 3 ? { rule: { kind: "own-read" }, label: "Hear it once, then build it" } :
  level >= 4 ? { rule: { kind: "whole" }, label: "Check once, first try, no Help" } : null;

/**
 * Immutable Challenge puzzles from word tasks, in a fixed order per level. A puzzle's place never moves once published:
 * new words are appended. Only tasks from reviewed, admitted banks are given to this in production.
 */
export function soundBoatPuzzles(tasks: readonly BuildTask[]): Puzzle<Descriptor>[] {
  const out: Puzzle<Descriptor>[] = [];
  for (const level of [1, 2, 3, 4, 5] as const) {
    const rows = tasks.filter((t) => t.level === level);
    rows.forEach((task, i) => {
      const rule = ruleOf(level), dare = rule && i < DARES_PER_LEVEL;
      out.push({
        ref: { bank: BANK_BASE + level - 1, puzzle: i, engine: "sound-boat", rules: 1, hash: sha256Hex(canonical(task)) },
        source: { kind: "school", game: "sound-boat", level, puzzle: `sb-${level}-${i}` },
        path: "endless",
        tier: level,
        title: `Level ${level} · Build the word ${i + 1}`,
        descriptor: task,
        dares: dare ? [{ slot: DARE_BASE + (level - 2) * DARES_PER_LEVEL + i, id: `sb-${level}-${i}`, label: rule.label, rule: rule.rule, help: "independent" as const }] : [],
        awards: [rule ? { rule: rule.rule, help: "independent" as const } : null, null] as const,
      });
    });
  }
  return out;
}
/** Production: only reviewed, admitted word-part records. Until a bank is admitted there are none, and Sound Boat has no Challenge. */
export const soundBoatProduction = (parts: readonly PartsWord[] = admittedParts) => soundBoatPuzzles(parts.map(taskOfParts));
