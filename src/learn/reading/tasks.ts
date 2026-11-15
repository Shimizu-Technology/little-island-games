import { random } from "../../games/types";
import { admittedParts } from "./admitted";
import { INHERITED_DIGEST, inheritedWords } from "./inherited";
import { hashOf, shuffled, type BuildTask } from "./build";
import { TILE_FAMILIES, TILE_TWINS, tileLabel } from "./graphemes";
import type { LetterWord, PartsWord } from "./records";
import { stepOf } from "./scope";
import { inheritedIssues } from "./validate";

/**
 * The only maker of child-visible reading tasks. The boundary is provenance, not shape: a task exists only when this
 * module minted it, by id or level, from one of two doors:
 * - `admittedParts`, the W1 registry door (manifest-registered banks that passed detached admission), and
 * - `inheritedWords`, the words shipped since 3.0.0, admitted only while they match `INHERITED_DIGEST`.
 * Nothing here takes record data, so a record that never went through a door cannot become a task. Every task is
 * frozen and remembered in a module-private set, and the boards, the round engine and the Challenge refuse any task
 * this module did not mint (`admittedTask`). Saves and replays keep ids and mint again on load.
 *
 * The W1 shape detector and the export backstop (`scripts/words/shipping.mjs`) still look for reading-shaped data in
 * the tree and in exports. They are supplementary layers; this is the boundary.
 */
declare const minted: unique symbol;
/** A task this module made. The type is a reminder; the runtime check is the guard. */
export type MintedTask = BuildTask & { readonly [minted]: true };
const made = new WeakSet<object>();

function seal(t: BuildTask): MintedTask {
  for (const part of [t.tiles, t.tray, ...t.alternates, t.alternates]) Object.freeze(part);
  if (t.cue) Object.freeze(t.cue);
  Object.freeze(t);
  made.add(t);
  return t as MintedTask;
}

const partsSkill = (r: PartsWord) =>
  r.kind === "compound" ? "read.compound" : r.kind === "syllables" ? "read.syllables" : r.kind === "prefix" ? "read.prefixes" : r.change && r.change !== "none" ? "read.spelling-change" : "read.endings";
/** A word built from word parts. The tray holds the right pieces and the record's tempting wrong ones. */
function partsTaskOf(r: PartsWord): MintedTask {
  return seal({
    id: r.id,
    word: r.word,
    level: r.level,
    skill: partsSkill(r),
    tiles: [...r.chunks],
    tray: shuffled([...r.chunks, ...r.distractors], hashOf(`parts:${r.id}`)),
    alternates: (r.alternates ?? []).map((a) => [...a]),
    cue: r.kind === "ending" || r.kind === "prefix" ? { base: r.base!, affix: r.affix!, gloss: r.gloss!, prefix: r.kind === "prefix" } : null,
  });
}
const twinsOf = (t: string) => TILE_TWINS.find((g) => g.includes(t)) ?? [t];
/** A word built from letter sounds: the right tiles plus look-alikes that are really wrong. */
function letterTaskOf(r: LetterWord): MintedTask {
  const rng = random(hashOf(`letters:${r.id}`));
  const chosen = [...r.tiles];
  const fits = (t: string) => !chosen.some((c) => twinsOf(c).includes(t) || tileLabel(c) === tileLabel(t));
  const room = Math.min(8, r.tiles.length + 3) - r.tiles.length;
  for (const needed of new Set(r.tiles)) {
    const pool = shuffled(TILE_FAMILIES.find((f) => f.includes(needed)) ?? TILE_FAMILIES[0], Math.floor(rng() * 1e9));
    let added = 0;
    for (const c of pool) if (added < 1 && chosen.length - r.tiles.length < room && fits(c)) { chosen.push(c); added++; }
  }
  return seal({
    id: r.id,
    word: r.word,
    level: r.level,
    skill: stepOf(r.step).skill,
    tiles: [...r.tiles],
    tray: shuffled(chosen, hashOf(`order:${r.id}`)),
    alternates: [],
    cue: null,
  });
}

let parts: ReadonlyMap<string, MintedTask> | undefined;
let letters: ReadonlyMap<string, MintedTask> | undefined;
const partsDoor = () => (parts ??= new Map(admittedParts.map((r) => [r.id, partsTaskOf(r)])));
/** Inherited words mint only while the shipped data still matches its pinned digest; otherwise there are none. */
function lettersDoor(): ReadonlyMap<string, MintedTask> {
  if (letters) return letters;
  if (inheritedIssues(inheritedWords, INHERITED_DIGEST).length) {
    refuse("The inherited reading words no longer match their pinned digest");
    return (letters = new Map());
  }
  return (letters = new Map(inheritedWords.records.map((r) => [r.id, letterTaskOf(r)])));
}

/** The admitted word-parts task with this id, or null. */
export const partsTaskById = (id: unknown): MintedTask | null => (typeof id === "string" && partsDoor().get(id)) || null;
/** Every admitted word-parts task at a level, in bank order. */
export const partsTasksAt = (level: 4 | 5): MintedTask[] => [...partsDoor().values()].filter((t) => t.level === level);
/** Every admitted word-parts task, in bank order. */
export const admittedPartsTasks = (): MintedTask[] => [...partsDoor().values()];
/** The inherited letter-sounds task with this id, or null. */
export const letterTaskById = (id: unknown): MintedTask | null => (typeof id === "string" && lettersDoor().get(id)) || null;

export const isMinted = (task: unknown): task is MintedTask => typeof task === "object" && task !== null && made.has(task);
const dev = () => (globalThis as { __DEV__?: unknown }).__DEV__ === true;
function refuse(why: string) {
  if (dev()) throw new Error(`${why}. Reading tasks come only from src/learn/reading/tasks.ts, by id, from the admitted or pinned inherited records.`);
}
/**
 * The check every consumer runs before it shows, scores or records a task. A task this module did not mint is refused:
 * in development that throws, so the mistake is loud; in a release it returns false and the consumer shows the safe
 * fallback and records nothing.
 */
export function admittedTask(task: unknown, where: string): task is MintedTask {
  if (isMinted(task)) return true;
  refuse(`${where} was given a reading task that was not minted from an admitted record`);
  return false;
}
/** What a board shows instead of a refused task: the Challenge's existing "could not open" words, with nothing to press. */
export const REFUSED_TASK_TEXT = "This puzzle could not open. Your saved work is kept. Try again, or choose another puzzle.";
