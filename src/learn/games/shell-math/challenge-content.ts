import { planLength, type Level } from "../../../math/kit";
import type { AwardRule, DareRule, Puzzle, RegisteredDare } from "../../../challenge/types";
import { sha256Hex } from "../../../puzzles/sha256";
import bank from "./challenge-bank.json";
import { waysOf, type Descriptor } from "./challenge-task";

/** Banks 420-424 are Endless Tide for Levels 1 to 5, 425 is Deep Water. Dares 1000-1079, five levels of sixteen. */
export const FIRST_BANK = 420, DEEP_BANK = 425, FIRST_DARE = 1000, DARES_PER_LEVEL = 16;
export const bankOfLevel = (level: Level) => FIRST_BANK + level - 1;
const clean: DareRule = { kind: "clean" };

const label: Record<Level, string> = {
  1: "No Help and no misses", 2: "No Help and no misses", 3: "Say it two ways", 4: "Right on the first check, no Help", 5: "Fewest moves",
};
const levelName: Record<Level, string> = { 1: "Count on", 2: "Ten and ones", 3: "Bridge a ten", 4: "Make a ten", 5: "Open a ten" };
const deepTitle: Record<string, string> = { regroup: "Open a number", missing: "Find the missing number", equalize: "Make the piles equal", pairs: "Pair up the tens" };

/** Fewest accepted moves over every way of a puzzle. Misses count as moves, so a dare at this par means no misses. */
const par = (d: Descriptor) => Math.min(...waysOf(d).map((w) => planLength(w.plan)));

function ruleFor(level: Level, d: Descriptor): DareRule {
  if (level === 3) return { kind: "two-ways" };
  if (level === 4) return { kind: "whole" };
  if (level === 5) return { kind: "par", metric: "steps", max: par(d) };
  return clean;
}
const helpFor = (rule: DareRule): RegisteredDare["help"] => (rule.kind === "two-ways" ? "allowed" : "independent");

/** Whether a puzzle can carry its level's dare: levels 3 and 5 need real alternatives, and level 5 a strictly shorter one. */
export function hasDare(level: Level, d: Descriptor): boolean {
  if (d.t !== "fact") return false;
  if (level === 3) return d.ways.length >= 2;
  if (level === 5) return d.ways.length >= 2 && par(d) < planLength(waysOf(d)[0].plan);
  return true;
}

const withSlots = (): Puzzle<Descriptor>[] => {
  const out: Puzzle<Descriptor>[] = [];
  for (const level of [1, 2, 3, 4, 5] as Level[]) {
    const rows = (bank.facts as unknown as Record<string, Descriptor[]>)[String(level)];
    let used = 0;
    rows.forEach((d, i) => {
      const bankSlot = bankOfLevel(level), withDare = used < DARES_PER_LEVEL && hasDare(level, d);
      const rule = ruleFor(level, d), dares: RegisteredDare[] = [];
      if (withDare) {
        // Slots are assigned in bank order and never reused, so a later edit cannot move a published dare.
        dares.push({ slot: FIRST_DARE + (level - 1) * DARES_PER_LEVEL + used, id: `shell-${level}-${i}`, label: label[level], rule, help: helpFor(rule) });
        used++;
      }
      const award: AwardRule = { rule: withDare ? rule : clean, help: withDare ? helpFor(rule) : "independent" };
      const min = par(d);
      out.push({
        ref: { bank: bankSlot, puzzle: i, engine: "shell-math", rules: 1, hash: sha256Hex(JSON.stringify(d)) },
        source: { kind: "endless", bank: bankSlot, puzzle: i }, path: "endless", tier: level, title: `Level ${level} · ${levelName[level]} ${i + 1}`,
        descriptor: d, dares, awards: [award, null], par: { metric: "steps", lower: min, upper: min },
      });
    });
  }
  (bank.deep as unknown as Descriptor[]).forEach((d, i) => {
    const kind = d.t, tier = ({ regroup: 3, missing: 4, equalize: 5, pairs: 6 } as Record<string, 3 | 4 | 5 | 6>)[kind], min = par(d);
    out.push({
      ref: { bank: DEEP_BANK, puzzle: i, engine: "shell-math", rules: 1, hash: sha256Hex(JSON.stringify(d)) },
      source: { kind: "deep-water", collection: DEEP_BANK, puzzle: i }, path: "deep-water", tier, title: `${deepTitle[kind]} ${(i % 4) + 1}`,
      descriptor: d, dares: [], awards: [{ rule: clean, help: "independent" }, null], par: { metric: "steps", lower: min, upper: min },
    });
  });
  return out;
};
export const shellPuzzles: Puzzle<Descriptor>[] = withSlots();
